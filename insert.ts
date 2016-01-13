((document: Document, window: Window) => {
  let fetchFunction: (url: string, init?: RequestInit) => Promise<Response>;

  function isSupportAllFeatures(): Array<string> {
    let lackOf: Array<string> = [];
    if (!localStorage) {
      lackOf.push('local storage');
    }
    if (!fetch) {
      if (!XMLHttpRequest) {
        lackOf.push('XMLHttpRequest');
      } else {
        fetchFunction = myFetch;
      }
    } else {
      fetchFunction = window.fetch;
    }
    if (!Promise) {
      lackOf.push('Promise');
    }

    return lackOf;
  }

  function initializeContainer(): HTMLDivElement {
    const container: HTMLDivElement = document.createElement('div');
    container.textContent = "now loading...";
    return container;
  }

  enum CacheStatus {
    NotIn,
    Valid,
    Expired,
  }

  interface CachedData {
    data?: string;
    status: CacheStatus;
  }

  function getDataFromCache(cache: Storage, key: string, isExpired: (date: number) => boolean): CachedData {
    let data = JSON.parse(cache.getItem(key));

    if (data === null) {
      return { data: null, status: CacheStatus.NotIn };
    }

    if (isExpired(data.date)) {
      cache.removeItem(key);
      return { data: data.data, status: CacheStatus.Expired };
    }

    return { data: data.data, status: CacheStatus.Valid };
  }

  function setDataToCache(cache: Storage, key: string, data: string): void {
    const now = new Date().getTime();
    cache.setItem(key, JSON.stringify({ date: now, data: data }));
  }


  function myFetch(url: string, init?: RequestInit): Promise<Response> {
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      request.onload = () => {
        resolve({ text: (): Promise<string> => {
          return new Promise((resolve) => {
            resolve(request.response);
          });
        }, status: request.status });
      };
      request.onerror = (e) => {
        reject(e);
      };
      request.open(init.method, url, true);
      for (let key in init.headers) {
        if (init.headers.hasOwnProperty(key)) {
          request.setRequestHeader(key, init.headers[key]);
        }
      }
      request.send(init.body);
    });
  }

  enum ContentFrom {
    Cache,
    Source
  }

  interface Content {
    data: string;
    from: ContentFrom;
  }

  function loadSource(url: string, prefix: string): Promise<Content> {
    const key = `${prefix}src_${url}`;
    const cache: Storage = window.localStorage;
    const cacheResult = getDataFromCache(cache, key, (date) => {
      const randomMinute = Math.random() * 100;
      const now = new Date().getTime();
      return date + (10 * (60 + randomMinute) * 60 * 1000) < now;
    });
    const cachedData = cacheResult.data;

    const headers: { [index: string]: string } = {'Content-type': 'text/plain'};
    switch (cacheResult.status) {
      case CacheStatus.Valid:
        return Promise.resolve({ data: cachedData, from: ContentFrom.Cache });
      case CacheStatus.NotIn:
        return fetchFunction(url, {method: 'GET', headers}).then((request) => request.text()).then((request) => {
          setDataToCache(cache, key, request);
          return { data: request, from: ContentFrom.Source };
        });
      case CacheStatus.Expired:
        return fetchFunction(url, {method: 'GET', headers}).then((request) => request.text()).then((request) => {
          const fetchedData: string = request;
          const status = fetchedData === cachedData ? ContentFrom.Cache : ContentFrom.Source;
          setDataToCache(cache, key, fetchedData);
          return { data: fetchedData, from: status };
        });
    }
  }

  interface Config {
    prefix?: string;
    src?: string;
    format?: string;
  };

  function getConfig(scriptTag: HTMLScriptElement): Config {
    let config: Config = <any>scriptTag.dataset;

    const DEFAULT_FORMAT = 'html';
    if (!config.format) {
      config.format = DEFAULT_FORMAT;
    }

    const DEFAULT_PREFIX = 'insert';
    if (!config.prefix) {
      config.prefix = DEFAULT_PREFIX;
    }
    config.prefix = `${config.prefix}_`;

    return config;
  }

  interface MarkdownCache {
    date: number;
    data: string;
  }

  function setHtmlContent(html: string, container: HTMLDivElement): void {
    container.innerHTML = html;
  }
  function setMarkdownContent(content: Content, container: HTMLDivElement, config: Config): void {
    const markdown = content.data;
    const prefix = config.prefix;
    const source = config.src;
    const key = `${prefix}markdown_${source}`;
    let cache: Storage = window.localStorage;
    let html = getDataFromCache(cache, key, (date) => content.from === ContentFrom.Source).data;

    if (html !== null) {
      setHtmlContent(html, container);
      return;
    }

    const headers: { [index: string]: string } = {'Content-type': 'text/plain'};
    fetchFunction('https://api.github.com/markdown/raw', {method: 'POST', body: markdown, headers})
    .then((request) => {
      const text = request.text();
      const status = request.status;
      return text.then((text) => {
        return {
          text: text,
          status: status
        };
      });
    }).then((response) => {
      const text = response.text;
      if (response.status === 403) {
        return 'Cannot convert markdown to html, because API rate limit exceeded';
      }
      setDataToCache(cache, key, text);
      return text;
    }).catch((error: Event) => {
      return 'Cannot convert markdown to html';
    }).then((_) => setHtmlContent(_, container));
  }
  function setContent(content: Content, container: HTMLDivElement, config: Config): void {
    switch (config.format) {
      case 'html':
        setHtmlContent(content.data, container);
        break;
      case 'markdown':
        setMarkdownContent(content, container, config);
        break;
      default:
        throw 'No valid format.';
    }
  }

  function insertInternal(position: HTMLDivElement,
                          config: Config,
                          insert: (content: Content, position: HTMLDivElement, config: Config) => void): void {
    let lackOf = isSupportAllFeatures();
    if (lackOf.length !== 0) {
      const message = `Cannot insert contents because this browser does not support ${lackOf.join(', ')}`;
      position.textContent = message;
      return;
    }

    let content = loadSource(config.src, config.prefix);
    content.then((_: Content) => insert(_, position, config));
    content.catch((e) => {
      position.innerText = e.toString();
    });
  }
  function insertHtml(position: HTMLDivElement, config: Config): void {
    insertInternal(position, config, (content: Content, position: HTMLDivElement, config: Config) => {
      setHtmlContent(content.data, position);
    });
  }
  function insertMarkdown(position: HTMLDivElement, config: Config): void {
    insertInternal(position, config, setMarkdownContent);
  }
  function insert(position: HTMLDivElement, config: Config): void {
    insertInternal(position, config, setContent);
  }

  function insertHereInternal(config: Config, insert: (container: HTMLDivElement, config: Config) => void): void {
    let scriptTag: HTMLScriptElement = (<any>document).currentScript;
    let container = initializeContainer();
    scriptTag.parentNode.insertBefore(container, scriptTag);
    insert(container, config);
  }
  function insertHtmlHere(config: Config): void {
    insertHereInternal(config, insertHtml);
  }
  function insertMarkdownHere(config: Config): void {
    insertHereInternal(config, insertMarkdown);
  }
  function insertHere(config: Config): void {
    insertHereInternal(config, insert);
  }

  let scriptTag: HTMLScriptElement = (<any>document).currentScript;
  let config = getConfig(scriptTag);
  if (config.src !== undefined) {
    insertHere(config);
  } else {
    /* tslint:disable no-string-literal */
    window['insert'] = insert;
    window['insertHtml'] = insertHtml;
    window['insertMarkdown'] = insertMarkdown;
    window['insertHere'] = insertHere;
    window['insertHtmlHere'] = insertHtmlHere;
    window['insertMarkdownHere'] = insertMarkdownHere;
    /* tslint:enable no-string-literal */
  }
})(document, window);
