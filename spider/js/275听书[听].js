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
    title: '275听书[听]',
    编码: 'utf-8',
    host: 'https://m.i275.com',
    homeUrl: '/',
    url: '/',
    searchUrl: '/search.php?q=**',
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    timeout: 25000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.i275.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'no-cache'
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
            const imgs = html.querySelectorAll('img');
            imgs.forEach(img => {
                const src = img.src || '';
                const alt = img.alt || '';
                const cls = img.className || '';
                if ((src.includes('cover') || src.includes('book') || alt.includes('封面') || cls.includes('cover')) && src) {
                    bookPic = src;
                }
            });
            if (!bookPic) {
                const firstImg = html.querySelector('div.w-32 img, div.book-cover img, img[width="120"]');
                bookPic = firstImg?.src || '';
            }
            const introSelectors = ['.line-clamp-3', '.book-intro', '.intro', 'p[class*="intro"]', 'div[class*="intro"]'];
            for (let sel of introSelectors) {
                const el = html.querySelector(sel);
                if (el) {
                    const text = el.textContent?.trim();
                    if (text && text.length > 10) {
                        bookDesc = text;
                        break;
                    }
                }
            }
        } catch (e) {}
        return {
            lists: chapters.length > 0 ? chapters : [{ title: '暂无章节', url: input }],
            pic: bookPic,
            desc: bookDesc || '暂无简介'
        };
    }),
    lazy: $js.toString(async () => {
        const fetchWithRetry = async (url, options, maxRetries = 5, delay = 2500) => {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 1200 + delay * i));
                    const res = await fetch(url, {
                        ...options,
                        timeout: rule.timeout,
                        cache: 'no-store'
                    });
                    if (res.status >= 500 && i < maxRetries - 1) continue;
                    return res;
                } catch (e) {
                    if (i === maxRetries - 1) throw e;
                }
            }
        };
        try {
            const playPageRes = await fetchWithRetry(input, { headers: rule.headers });
            const playHtml = await playPageRes.text();
            let audioUrl = '';
            const patterns = [
                /url\s*[:=]\s*["']([^"']+\.(m4a|mp3|m4b|aac))["']/gi,
                /src\s*[:=]\s*["']([^"']+\.(m4a|mp3|m4b|aac))["']/gi,
                /audio\s*[:=]\s*["']([^"']+\.(m4a|mp3|m4b|aac))["']/gi,
                /file\s*[:=]\s*["']([^"']+\.(m4a|mp3|m4b|aac))["']/gi,
                /link\s*[:=]\s*["']([^"']+\.(m4a|mp3|m4b|aac))["']/gi,
                /["']([^"']+\.(m4a|mp3|m4b|aac)\?[^"']*)["']/gi,
                /["']([^"']*listen[^"']*\.(m4a|mp3|m4b|aac)[^"']*)["']/gi
            ];
            for (let pat of patterns) {
                let match;
                while ((match = pat.exec(playHtml)) !== null) {
                    let candidate = match[1];
                    if (candidate && candidate.length > 10) {
                        audioUrl = candidate;
                        break;
                    }
                }
                if (audioUrl) break;
            }
            if (!audioUrl) {
                const scriptMatch = playHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
                if (scriptMatch) {
                    for (let script of scriptMatch) {
                        for (let pat of patterns) {
                            let m = pat.exec(script);
                            if (m && m[1]) {
                                audioUrl = m[1];
                                break;
                            }
                        }
                        if (audioUrl) break;
                    }
                }
            }
            if (audioUrl) {
                if (audioUrl.startsWith('//')) audioUrl = 'https:' + audioUrl;
                if (audioUrl.startsWith('/')) audioUrl = rule.host + audioUrl;
                if (audioUrl.startsWith('http://')) audioUrl = audioUrl.replace('http://', 'https://');
            }
            return { url: audioUrl || input, parse: 0 };
        } catch (e) {
            return { url: input, parse: 0 };
        }
    }),
    play_parse: false,
    sniffer: 0
};
