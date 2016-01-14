'use strict';

(function (document, window) {
    var fetchFunction = undefined;
    function isSupportAllFeatures() {
        var lackOf = [];
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
    function initializeContainer() {
        var container = document.createElement('div');
        container.textContent = "now loading...";
        return container;
    }
    var CacheStatus;
    (function (CacheStatus) {
        CacheStatus[CacheStatus["NotIn"] = 0] = "NotIn";
        CacheStatus[CacheStatus["Valid"] = 1] = "Valid";
        CacheStatus[CacheStatus["Expired"] = 2] = "Expired";
    })(CacheStatus || (CacheStatus = {}));
    function getDataFromCache(cache, key, isExpired) {
        var data = JSON.parse(cache.getItem(key));
        if (data === null) {
            return { status: CacheStatus.NotIn };
        }
        if (isExpired(data.date)) {
            cache.removeItem(key);
            return { data: data.data, status: CacheStatus.Expired };
        }
        return { data: data.data, status: CacheStatus.Valid };
    }
    function setDataToCache(cache, key, data) {
        var date = new Date().getTime();
        cache.setItem(key, JSON.stringify({ date: date, data: data }));
    }
    function myFetch(url, init) {
        return new Promise(function (resolve, reject) {
            var request = new XMLHttpRequest();
            request.onload = function () {
                resolve({ text: function text() {
                        return new Promise(function (resolve) {
                            resolve(request.response);
                        });
                    }, status: request.status });
            };
            request.onerror = function (e) {
                reject(e);
            };
            request.open(init.method, url, true);
            for (var key in init.headers) {
                if (init.headers.hasOwnProperty(key)) {
                    request.setRequestHeader(key, init.headers[key]);
                }
            }
            request.send(init.body);
        });
    }
    var ContentFrom;
    (function (ContentFrom) {
        ContentFrom[ContentFrom["Cache"] = 0] = "Cache";
        ContentFrom[ContentFrom["Source"] = 1] = "Source";
    })(ContentFrom || (ContentFrom = {}));
    function loadSource(url, prefix) {
        var key = prefix + 'src_' + url;
        var cache = window.localStorage;
        var cacheResult = getDataFromCache(cache, key, function (date) {
            var randomMinute = Math.random() * 100;
            var now = new Date().getTime();
            return date + 10 * (60 + randomMinute) * 60 * 1000 < now;
        });
        var cachedData = cacheResult.data;
        var headers = { 'Content-type': 'text/plain' };
        var method = 'GET';
        switch (cacheResult.status) {
            case CacheStatus.Valid:
                return Promise.resolve({ data: cachedData, from: ContentFrom.Cache });
            case CacheStatus.NotIn:
                return fetchFunction(url, { method: method, headers: headers }).then(function (request) {
                    return request.text();
                }).then(function (request) {
                    setDataToCache(cache, key, request);
                    return { data: request, from: ContentFrom.Source };
                });
            case CacheStatus.Expired:
                return fetchFunction(url, { method: method, headers: headers }).then(function (request) {
                    return request.text();
                }).then(function (request) {
                    var fetchedData = request;
                    var status = fetchedData === cachedData ? ContentFrom.Cache : ContentFrom.Source;
                    setDataToCache(cache, key, fetchedData);
                    return { data: fetchedData, from: status };
                });
        }
    }
    ;
    function setDefaultConfig(config) {
        var DEFAULT_FORMAT = 'html';
        if (!config.format) {
            config.format = DEFAULT_FORMAT;
        }
        var DEFAULT_PREFIX = 'insert';
        if (!config.prefix) {
            config.prefix = DEFAULT_PREFIX;
        }
        config.prefix = config.prefix + '_';
        return config;
    }
    function setHtmlContent(html, container) {
        container.innerHTML = html;
    }
    function setMarkdownContent(content, container, config) {
        var prefix = config.prefix;
        var source = config.src;
        var key = prefix + 'markdown_' + source;
        var cache = window.localStorage;
        var html = getDataFromCache(cache, key, function (date) {
            return content.from === ContentFrom.Source;
        }).data;
        if (html !== undefined) {
            setHtmlContent(html, container);
            return;
        }
        var headers = { 'Content-type': 'text/plain' };
        var method = 'POST';
        var body = content.data;
        fetchFunction('https://api.github.com/markdown/raw', { method: method, body: body, headers: headers }).then(function (request) {
            var text = request.text();
            var status = request.status;
            return text.then(function (text) {
                return { text: text, status: status };
            });
        }).then(function (response) {
            var text = response.text;
            if (response.status === 403) {
                return 'Cannot convert markdown to html, because API rate limit exceeded';
            }
            setDataToCache(cache, key, text);
            return text;
        }).catch(function (error) {
            return 'Cannot convert markdown to html';
        }).then(function (_) {
            return setHtmlContent(_, container);
        });
    }
    function setContent(content, container, config) {
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
    function insertInternal(position, rawConfig, insert) {
        var config = setDefaultConfig(rawConfig);
        var lackOf = isSupportAllFeatures();
        if (lackOf.length !== 0) {
            var message = 'Cannot insert contents because this browser does not support ' + lackOf.join(', ');
            position.textContent = message;
            return;
        }
        var content = loadSource(config.src, config.prefix);
        content.then(function (_) {
            return insert(_, position, config);
        });
        content.catch(function (e) {
            position.innerText = e.toString();
        });
    }
    function insertHtml(position, config) {
        insertInternal(position, config, function (content, position, config) {
            setHtmlContent(content.data, position);
        });
    }
    function insertMarkdown(position, config) {
        insertInternal(position, config, setMarkdownContent);
    }
    function insert(position, config) {
        insertInternal(position, config, setContent);
    }
    function insertHereInternal(config, insert) {
        var scriptTag = document.currentScript;
        var container = initializeContainer();
        scriptTag.parentNode.insertBefore(container, scriptTag);
        insert(container, config);
    }
    function insertHtmlHere(config) {
        insertHereInternal(config, insertHtml);
    }
    function insertMarkdownHere(config) {
        insertHereInternal(config, insertMarkdown);
    }
    function insertHere(config) {
        insertHereInternal(config, insert);
    }
    var scriptTag = document.currentScript;
    var config = scriptTag.dataset;
    if (config.src !== undefined) {
        insertHere(config);
    } else {
        window['insert'] = insert;
        window['insertHtml'] = insertHtml;
        window['insertMarkdown'] = insertMarkdown;
        window['insertHere'] = insertHere;
        window['insertHtmlHere'] = insertHtmlHere;
        window['insertMarkdownHere'] = insertMarkdownHere;
    }
})(document, window);
