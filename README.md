# insert.js
Insert dynamically loaded contents on the web page.
Currently, it supports html and markdown.

## How to use
### Easy ues
You can pass a data-format and a data-src.
```html
<script async src='insert.js' data-format='html' data-src='some.html'></script>
<script async src='insert.js' data-format='markdown' data-src='some.md'></script>
```

### More API
insert.js reveals below APIs when data-src is not given.
1. insert(position, {format, src})
2. insertHtml(position, {src})
3. insertMarkdown(position, {src})
4. insertHere({format, src})
5. insertHtmlHere({src})
6. insertMarkdownHere({src})

```html
<script src='insert.js'></script>
<div id='a'></div>
<script>
insertHere({format: 'markdown', src: 'some.md'});
insert(document.getElementById('a'), {format: 'html', src: 'some.html'});
</script>
```

## Release
### latest
* [minified](https://goo.gl/801gOg)
* [uncompressed](https://goo.gl/2emRRr)

### 1.0.0
* [minfiied](https://goo.gl/h17KdZ)
* [uncompressed](https://goo.gl/bgLAhI)
