function initialize_container(): HTMLDivElement {
  const container: HTMLDivElement = document.createElement('div');
  container.textContent = "now loading...";
  return container;
}

function load_html(url: string): Promise<string> {
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

interface IConfig {
  prefix: string;
  src: string;
  format: Format;
};

function get_format(format: string): Format {
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

function get_prefix(data: DOMStringMap): string {
  /* tslint:disable no-string-literal */
  let prefix = data['prefix'];
  /* tslint:enable no-string-literal */

  if (prefix) {
    return prefix + '_';
  }

  // default prefix is insert_
  return 'insert_';
}

function get_config(script_tag: HTMLScriptElement): IConfig {
  let data: DOMStringMap = script_tag.dataset;
  /* tslint:disable no-string-literal */
  let src = data['src'];
  let format = get_format(data['format']);
  let prefix = get_prefix(data);
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

function set_content(content: Promise<string>, container: HTMLDivElement, config: IConfig): void {
  function set_html_content(html: string) {
    container.innerHTML = html;
  }
  function set_markdown_content(markdown: string) {
    const PREFIX = config.prefix;
    const SOURCE = config.src;
    let local_storage = window.localStorage;
    let cache = JSON.parse(localStorage.getItem(PREFIX + SOURCE));
    const NOW = new Date().getTime();
    if (cache !== null) {
      const RANDOM_MINUTE = Math.ceil(Math.random() * 100);
      if (cache.date + (10 * (60 + RANDOM_MINUTE) * 60 * 1000) > NOW) {
        container.innerHTML = cache.data;
        return;
      }
      localStorage.removeItem(PREFIX + SOURCE);
    }

    let request = new XMLHttpRequest();
    request.onload = () => {
      let response = request.response;

      if (request.status === 403) {
        container.innerHTML = 'Cannot convert markdown to html, because API rate limit exceeded';
        return;
      }
      local_storage.setItem(PREFIX + SOURCE, JSON.stringify({ date: NOW, data: response }));
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
      content.then(set_html_content);
      break;
    case Format.Markdown:
      content.then(set_markdown_content);
      break;
  }
  content.catch((e) => {
    container.innerText = e.toString();
  });
}

(() => {
  let script_tag: HTMLScriptElement = (<any>document).currentScript;
  let config = get_config(script_tag);
  let container = initialize_container();
  script_tag.parentNode.insertBefore(container, script_tag);
  let content = load_html(config.src);
  set_content(content, container, config);
})();
