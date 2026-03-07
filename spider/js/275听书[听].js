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
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.i275.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
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
                const href = item.getAttribute('href') || '';
                if (title && href) {
                    lists.push({
                        title: title,
                        pic: cover,
                        desc: desc,
                        url: href.startsWith('/') ? rule.host + href : href
                    });
                }
            });
        } catch (e) {}
        return lists;
    }),
    二级: $js.toString(() => {
        let chapters = [];
        try {
            const chapterItems = html.querySelectorAll('a[href*="/play/"]');
            chapterItems.forEach(item => {
                const chapterTitle = item.textContent?.trim() || '';
                const chapterHref = item.getAttribute('href') || '';
                if (chapterTitle && chapterHref && chapterTitle.length > 1) {
                    chapters.push({
                        title: chapterTitle,
                        url: chapterHref.startsWith('/') ? rule.host + chapterHref : chapterHref
                    });
                }
            });
        } catch (e) {}
        return {
            lists: chapters,
            pic: html.querySelector('img[alt*="封面"], img[class*="cover"], div.w-32 img')?.src || '',
            desc: html.querySelector('.line-clamp-3, .book-intro, p[class*="intro"]')?.textContent?.trim() || ''
        };
    }),
    lazy: $js.toString(async () => {
        const fetchWithRetry = async (url, options, maxRetries = 3, delay = 1500) => {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + delay * i));
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
            const audioMatch = playHtml.match(/url:\s*["']([^"']+\.(m4a|mp3))["']/i) || playHtml.match(/src=["']([^"']+\.(m4a|mp3))["']/i);
            if (audioMatch && audioMatch[1]) {
                audioUrl = audioMatch[1].startsWith('//') ? 'https:' + audioMatch[1] : audioMatch[1];
                audioUrl = audioUrl.startsWith('http://') ? audioUrl.replace('http://', 'https://') : audioUrl;
            }
            return { url: audioUrl || input, parse: 0 };
        } catch (e) {
            return { url: input, parse: 0 };
        }
    }),
    play_parse: false,
    sniffer: 0
};
