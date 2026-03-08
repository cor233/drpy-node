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
    二级: async function () {
        let html = await request(this.input, { headers: this.headers, timeout: this.timeout });
        if (html.includes('275听书网提示您') || html.includes('请您支持正版')) {
            return {
                vod_id: '',
                vod_name: '访问被拦截',
                vod_pic: '',
                vod_content: '网站返回了支持正版提示，请稍后重试。',
                vod_play_from: '提示',
                vod_play_url: '暂无章节'
            };
        }
        let pic = pdfh(html, 'div.w-32 img&&src') || pdfh(html, 'div.book-cover img&&src');
        let desc = pdfh(html, '.line-clamp-3&&Text') || '暂无简介';
        let items = pdfa(html, 'a[id^="chapter-pos-"]');
        let playList = [];
        items.forEach(item => {
            let name = pdfh(item, 'span.text-sm&&Text') || pdfh(item, 'a&&Text');
            let link = pdfh(item, 'a&&href');
            if (name && link && link.includes('/play/')) {
                let fullLink = urljoin2(this.host, link);
                playList.push(name.trim() + '$' + fullLink);
            }
        });
        if (playList.length === 0) {
            items = pdfa(html, 'a[href*="/play/"]');
            items.forEach(item => {
                let name = pdfh(item, 'a&&Text');
                let link = pdfh(item, 'a&&href');
                if (name && link && !name.includes('上一页') && !name.includes('下一页')) {
                    let fullLink = urljoin2(this.host, link);
                    playList.push(name.trim() + '$' + fullLink);
                }
            });
        }
        let name = pdfh(html, 'h1.text-2xl&&Text');
        let author = html.match(/作者：<span[^>]*>([^<]+)</)?.[1] || '';
        return {
            vod_id: this.input.match(/book\/(\d+)/)?.[1] || '',
            vod_name: name,
            vod_pic: pic,
            vod_content: desc,
            vod_actor: author,
            vod_play_from: playList.length > 0 ? '正文' : '提示',
            vod_play_url: playList.length > 0 ? playList.join('#') : '暂无章节'
        };
    },
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
            const scriptContents = [];
            const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
            let scriptMatch;
            while ((scriptMatch = scriptRegex.exec(playHtml)) !== null) {
                scriptContents.push(scriptMatch[1]);
            }
            let audioUrl = null;
            const patterns = [
                /audio:\s*\[\s*\{\s*[^}]*?url:\s*['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)[^'"]*)['"]/i,
                /new\s+APlayer\s*\(\s*\{[^}]*audio:\s*\[\s*\{\s*url:\s*['"]([^'"]+)['"]/i,
                /(?:var|let|const)\s+(?:audioUrl|audioSrc|playUrl)\s*=\s*['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)[^'"]*)['"]/i,
                /<audio[^>]*src=['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)[^'"]*)['"]/i,
                /["'](?:url|src|file)["']\s*:\s*['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)(?:\?[^'"]*)?)['"]/i,
                /(https?:\/\/[^'"\s]+\.(?:m4a|mp3|aac|wav|ogg)(?:\?[^'"\s]*)?)/i
            ];
            for (let pattern of patterns) {
                const match = playHtml.match(pattern);
                if (match && match[1]) {
                    audioUrl = match[1];
                    break;
                }
            }
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
            audioUrl = normalizeUrl(audioUrl);
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
                return { url: input, parse: 1 };
            }
        } catch (e) {
            return { url: input, parse: 1 };
        }
    }),
    play_parse: false,
    sniffer: 0,
    globalCookie: '',
    预处理: async function () {
        try {
            const homeRes = await fetch(this.host, {
                headers: this.headers,
                credentials: 'include'
            });
            const setCookie = homeRes.headers.get('set-cookie');
            if (setCookie) {
                this.globalCookie = setCookie.split(';')[0];
            }
        } catch (e) {}
        return this.host;
    }
};
