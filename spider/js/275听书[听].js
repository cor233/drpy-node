/*
@header({
  searchable: 1,
  filterable: 0,
  quickSearch: 0,
  title: '275听书[听]',
  '类型': '听书',
  lang: 'ds'
})
*/
var rule = {
    类型: '听书',
    title: '275听书网',
    编码: 'utf-8',
    host: 'https://m.i275.com',
    homeUrl: '/',
    url: '/',
    searchUrl: '/search.php?q=**',
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.i275.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
    },
    limit: 12,
    hikerListCol: "avatar",
    hikerClassListCol: "avatar",
    推荐: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    一级: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    搜索: $js.toString(() => {
        let lists = [];
        try {
            const items = html.querySelectorAll('.divide-y a');
            items.forEach(item => {
                const title = item.querySelector('h3')?.textContent?.trim() || '';
                const cover = item.querySelector('img')?.src || '';
                const actor = item.querySelector('p:first-of-type')?.textContent?.replace('演播', '').trim() || '未知演播';
                const author = item.querySelector('p:nth-of-type(2)')?.textContent?.replace('作者', '').trim() || '未知作者';
                const desc = `${actor} | ${author}`;
                let href = item.getAttribute('href') || '';
                if (href && !href.startsWith('http')) {
                    href = href.startsWith('/') ? rule.host + href : rule.host + '/' + href;
                }
                if (title && href) {
                    lists.push({
                        title: title,
                        pic: cover,
                        desc: desc,
                        url: href
                    });
                }
            });
        } catch (e) {}
        return lists;
    }),
    二级: $js.toString(() => {
        let chapters = [];
        let bookPic = '';
        let bookDesc = '';
        try {
            const chapterLinks = html.querySelectorAll('a[id^="chapter-pos-"]');
            if (chapterLinks.length > 0) {
                chapterLinks.forEach(link => {
                    const href = link.getAttribute('href') || '';
                    const text = link.textContent?.replace(/\d+\.\s*/, '').trim() || '';
                    if (href.includes('/play/') && text) {
                        let fullHref = href;
                        if (!href.startsWith('http')) {
                            fullHref = href.startsWith('/') ? rule.host + href : rule.host + '/' + href;
                        }
                        chapters.push({
                            title: text,
                            url: fullHref
                        });
                    }
                });
            } else {
                const allLinks = html.querySelectorAll('a');
                allLinks.forEach(link => {
                    const href = link.getAttribute('href') || '';
                    const text = link.textContent?.trim() || '';
                    if (href.includes('/play/') && text && text.length > 1 && !text.includes('上一页') && !text.includes('下一页')) {
                        let fullHref = href;
                        if (!href.startsWith('http')) {
                            fullHref = href.startsWith('/') ? rule.host + href : rule.host + '/' + href;
                        }
                        chapters.push({
                            title: text,
                            url: fullHref
                        });
                    }
                });
            }
            
            const coverImg = html.querySelector('div.w-32 img, div.book-cover img');
            bookPic = coverImg?.src || '';
            
            const introEl = html.querySelector('.line-clamp-3');
            bookDesc = introEl?.textContent?.trim() || '暂无简介';
        } catch (e) {}
        return {
            lists: chapters.length > 0 ? chapters : [{ title: '暂无章节', url: input }],
            pic: bookPic,
            desc: bookDesc
        };
    }),
    lazy: $js.toString(async () => {
        const fetchWithRetry = async (url, options, maxRetries = 4, delay = 2000) => {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + delay * i));
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), rule.timeout);
                    const res = await fetch(url, { ...options, signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (res.ok) return res;
                    if (i === maxRetries - 1) throw new Error(`HTTP ${res.status}`);
                } catch (e) {
                    if (i === maxRetries - 1) throw e;
                }
            }
        };

        const normalizeUrl = (url) => {
            if (!url) return '';
            url = url.trim().replace(/^['"]|['"]$/g, '');
            if (url.startsWith('//')) url = 'https:' + url;
            else if (url.startsWith('http://')) url = url.replace('http://', 'https://');
            else if (!url.startsWith('http')) url = url.startsWith('/') ? rule.host + url : rule.host + '/' + url;
            return url;
        };

        try {
            const playPageRes = await fetchWithRetry(input, { headers: rule.headers });
            const playHtml = await playPageRes.text();

            // 提取所有 script 标签内容
            const scriptContents = [];
            const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
            let scriptMatch;
            while ((scriptMatch = scriptRegex.exec(playHtml)) !== null) {
                scriptContents.push(scriptMatch[1]);
            }

            let audioUrl = null;

            // 定义所有可能的匹配模式
            const patterns = [
                // APlayer 初始化
                /audio:\s*\[\s*\{\s*[^}]*?url:\s*['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)[^'"]*)['"]/i,
                /new\s+APlayer\s*\(\s*\{[^}]*audio:\s*\[\s*\{\s*url:\s*['"]([^'"]+)['"]/i,
                // JavaScript 变量
                /(?:var|let|const)\s+(?:audioUrl|audioSrc|playUrl)\s*=\s*['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)[^'"]*)['"]/i,
                // <audio> 标签
                /<audio[^>]*src=['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)[^'"]*)['"]/i,
                // JSON 属性
                /["'](?:url|src|file)["']\s*:\s*['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)(?:\?[^'"]*)?)['"]/i,
                // 直接匹配 http 链接
                /(https?:\/\/[^'"\s]+\.(?:m4a|mp3|aac|wav|ogg)(?:\?[^'"\s]*)?)/i
            ];

            // 先在整体 HTML 中匹配
            for (let pattern of patterns) {
                const match = playHtml.match(pattern);
                if (match && match[1]) {
                    audioUrl = match[1];
                    break;
                }
            }

            // 如果未找到，遍历所有 script 内容尝试匹配
            if (!audioUrl) {
                for (let script of scriptContents) {
                    for (let pattern of patterns) {
                        const match = script.match(pattern);
                        if (match && match[1]) {
                            audioUrl = match[1];
                            break;
                        }
                    }
                    if (audioUrl) break;
                }
            }

            // 尝试解析可能的 JSON 块
            if (!audioUrl) {
                const jsonMatches = playHtml.match(/\{(?:[^{}]|"[^"]*")*audio[^{}]*\}/gi);
                if (jsonMatches) {
                    for (let jsonStr of jsonMatches) {
                        try {
                            const safeJson = jsonStr.replace(/(\w+):/g, '"$1":');
                            const data = JSON.parse(safeJson);
                            audioUrl = data.url || data.src || data.audio || (data.audio && data.audio.url);
                            if (audioUrl) break;
                        } catch (e) {}
                    }
                }
            }

            // 格式化 URL
            audioUrl = normalizeUrl(audioUrl);

            // 如果找到音频 URL，返回带请求头的对象
            if (audioUrl) {
                return {
                    url: audioUrl,
                    parse: 0,
                    headers: {
                        'Referer': 'https://m.i275.com/',
                        'User-Agent': rule.headers['User-Agent']
                    }
                };
            } else {
                // 未找到则返回原 URL 并允许二次解析
                return { url: input, parse: 1 };
            }
        } catch (e) {
            return { url: input, parse: 1 };
        }
    }),
    play_parse: false,
    sniffer: 0
};
