((document: Document, window: Window) => {
  function initializeContainer(): HTMLDivElement {
    const container: HTMLDivElement = document.createElement('div');
    container.textContent = "now loading...";
    return container;
  }

  function getDataFromCache(cache: Storage, key: string): string {
    let data = JSON.parse(cache.getItem(key));

    if (data === null) {
      return null;
    }

    const randomMinute = Math.random() * 100;
    const now = new Date().getTime();
    if (data.date + (10 * (60 + randomMinute) * 60 * 1000) < now) {
      cache.removeItem(key);
      return null;
    }

    return data.data;
  }

  function setDataToCache(cache: Storage, key: string, data: string): void {
    const now = new Date().getTime();
    cache.setItem(key, JSON.stringify({ date: now, data: data }));
  }

  function loadHtml(url: string): Promise<string> {
    let promise = new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      request.onload = () => {
        let response: string = request.response;
        resolve(response);
      };
      request.onerror = (e) => {
        reject(e);
      };
      request.open('GET', url, true);
      request.send();
    });

    return promise;
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

  function getConfig(scriptTag: HTMLScriptElement): Config {
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

  function setContent(content: Promise<string>, container: HTMLDivElement, config: Config): void {
    function setHtmlContent(html: string): void {
      container.innerHTML = html;
    }
    function setMarkdownContent(markdown: string): void {
      const prefix = config.prefix;
      const source = config.src;
      const key = prefix + source;
      let cache: Storage = window.localStorage;
      let html = getDataFromCache(cache, key);

      if (html !== null) {
        container.innerHTML = html;
        return;
      }

      let request = new XMLHttpRequest();
      request.onload = () => {
        let response = request.response;

        if (request.status === 403) {
          container.innerHTML = 'Cannot convert markdown to html, because API rate limit exceeded';
          return;
        }
        setDataToCache(cache, key, response);
        container.innerHTML = response;
      };
      request.onerror = (e) => {
        container.innerText = 'Cannot convert markdown to html';
      };
      request.open('POST', 'https://api.github.com/markdown/raw', true);
      request.setRequestHeader('Accept', 'application/vnd.github.v3+json');
      request.send(markdown);
    }

    switch (config.format) {
      case Format.Html:
        content.then(setHtmlContent);
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
  let content = loadHtml(config.src);
  setContent(content, container, config);
})(document, window);
