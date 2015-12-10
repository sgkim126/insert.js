((document: Document, window: Window) => {
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

  function getDataFromCache(cache: Storage, key: string): CachedData {
    let data = JSON.parse(cache.getItem(key));

    if (data === null) {
      return { data: null, status: CacheStatus.NotIn };
    }

    const randomMinute = Math.random() * 100;
    const now = new Date().getTime();
    if (data.date + (10 * (60 + randomMinute) * 60 * 1000) < now) {
      cache.removeItem(key);
      return { data: data.data, status: CacheStatus.Expired };
    }

    return { data: data.data, status: CacheStatus.Valid };
  }

  function setDataToCache(cache: Storage, key: string, data: string): void {
    const now = new Date().getTime();
    cache.setItem(key, JSON.stringify({ date: now, data: data }));
  }

  interface RequestHeader {
    Accept?: string;
  }

  function request(method: string, url: string, data: any, header: RequestHeader = {}): Promise<XMLHttpRequest> {
    let promise = new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      request.onload = () => {
        resolve(request);
      };
      request.onerror = (e) => {
        reject(e);
      };
      request.open(method, url, true);
      for (let key in header) {
        if (header.hasOwnProperty(key)) {
          request.setRequestHeader(key, header[key]);
        }
      }
      request.send(data);
    });

    return promise;
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
    const key = prefix + 'src_' + url;
    const cache: Storage = window.localStorage;
    const source = getDataFromCache(cache, key).data;

    if (source !== null) {
      return Promise.resolve({ data: source, from: ContentFrom.Cache });
    }

    return request('GET', url, null).then((request) => {
      setDataToCache(cache, key, request.response);
      return { data: request.response, from: ContentFrom.Source };
    });
  }

  enum Format {
    Html,
    Markdown
  };

  interface Config {
    prefix: string;
    src: string;
    format: Format;
  };

  function getConfig(scriptTag: HTMLScriptElement): Config {
    function getFormat(format: string): Format {
      // default format is html
      if (format === undefined) {
        return Format.Html;
      }

      format = format.toLowerCase();

      if (format === Format[Format.Html].toLowerCase()) {
        return Format.Html;
      }

      if (format === Format[Format.Markdown].toLowerCase()) {
        return Format.Markdown;
      }

      // default format is html
      return Format.Html;
    }

    function getPrefix(data: DOMStringMap): string {
      /* tslint:disable no-string-literal */
      let prefix = data['prefix'];
      /* tslint:enable no-string-literal */

      if (prefix) {
        return prefix + '_';
      }

      // default prefix is insert_
      return 'insert_';
    }

    let data: DOMStringMap = scriptTag.dataset;
    /* tslint:disable no-string-literal */
    let src = data['src'];
    let format = getFormat(data['format']);
    let prefix = getPrefix(data);
    /* tslint:enable no-string-literal */
    return {
      format: format,
      prefix: prefix,
      src: src
    };
  }

  interface MarkdownCache {
    date: number;
    data: string;
  }

  function setContent(content: Promise<Content>, container: HTMLDivElement, config: Config): void {
    function setHtmlContent(html: string): void {
      container.innerHTML = html;
    }
    function setMarkdownContent(content: Content): void {
      const markdown = content.data;
      const prefix = config.prefix;
      const source = config.src;
      const key = prefix + source;
      let cache: Storage = window.localStorage;
      let html = getDataFromCache(cache, key).data;

      if (html !== null) {
        setHtmlContent(html);
        return;
      }

      request('POST', 'https://api.github.com/markdown/raw', markdown)
      .then((request) => {
        let response = request.response;

        if (request.status === 403) {
          return 'Cannot convert markdown to html, because API rate limit exceeded';
        }

        setDataToCache(cache, key, response);
        return response;
      }).catch((error: Event) => {
        return 'Cannot convert markdown to html';
      }).then(setHtmlContent);
    }

    switch (config.format) {
      case Format.Html:
        content.then((_: Content) => { setHtmlContent(_.data); });
      break;
      case Format.Markdown:
        content.then(setMarkdownContent);
      break;
    }
    content.catch((e) => {
      container.innerText = e.toString();
    });
  }

  let scriptTag: HTMLScriptElement = (<any>document).currentScript;
  let config = getConfig(scriptTag);
  let container = initializeContainer();
  scriptTag.parentNode.insertBefore(container, scriptTag);
  let content = loadSource(config.src, config.prefix);
  setContent(content, container, config);
})(document, window);
