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

function get_config(script_tag: HTMLElement): IConfig {
  let data: DOMStringMap = script_tag.dataset;
  /* tslint:disable no-string-literal */
  let src = data['src'];
  let format = get_format(data['format']);
  /* tslint:enable no-string-literal */
  return {
    format: format,
    src: src
  };
}

function set_content(content: Promise<string>, container: HTMLDivElement, config: IConfig): void {
  function set_html_content(html: string) {
    container.innerHTML = html;
  }
  function set_markdown_content(markdown: string) {
    let request = new XMLHttpRequest();
    request.onload = () => {
      let response = request.response;
      container.innerHTML = response;
    };
    request.onerror = (e) => {
      container.innerText = e.toString();
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
  let script_tag: any = (<any>document).currentScript;
  let config = get_config(script_tag);
  let container = initialize_container();
  script_tag.parentNode.insertBefore(container, script_tag);
  let content = load_html(config.src);
  set_content(content, container, config);
})();
