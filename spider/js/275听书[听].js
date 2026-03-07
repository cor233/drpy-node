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
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://m.i275.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
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
        } catch (e) {
            console.log('搜索解析失败:', e);
        }
        return lists;
    }),
    二级: $js.toString(() => {
        let chapters = [];
        try {
            const chapterItems = html.querySelectorAll('.grid-cols-1 a[id^="chapter-pos-"]');
            Array.from(chapterItems).slice(0, 50).forEach(item => {
                const chapterTitle = item.querySelector('span.text-gray-700')?.textContent?.trim() || '';
                const chapterHref = item.getAttribute('href') || '';
                if (chapterTitle && chapterHref) {
                    chapters.push({
                        title: chapterTitle,
                        url: chapterHref.startsWith('/') ? rule.host + chapterHref : chapterHref
                    });
                }
            });
        } catch (e) {
            console.log('章节解析失败:', e);
        }
        return {
            lists: chapters,
            pic: html.querySelector('div.w-32 img')?.src || '',
            desc: html.querySelector('.line-clamp-3')?.textContent?.trim() || ''
        };
    }),
    lazy: $js.toString(async () => {
        const fetchWithRetry = async (url, options, maxRetries = 3, delay = 1000) => {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + delay * i));
                    const res = await fetch(url, {
                        ...options,
                        timeout: rule.timeout,
                        cache: 'no-cache'
                    });
                    if (res.status >= 500 && i < maxRetries - 1) {
                        console.log(`服务器返回${res.status}，第${i+1}次重试`);
                        continue;
                    }
                    return res;
                } catch (e) {
                    if (i < maxRetries - 1) {
                        console.log(`请求失败${e.message}，第${i+1}次重试`);
                        continue;
                    }
                    throw e;
                }
            }
            throw new Error('达到最大重试次数，请求失败');
        };
        try {
            const playPageRes = await fetchWithRetry(input, {
                headers: rule.headers,
                mode: 'no-cors'
            });
            if (!playPageRes.ok) {
                return { url: input, parse: 0 };
            }
            const playHtml = await playPageRes.text();
            let audioUrl = '';
            const audioMatch = playHtml.match(/new APlayer\({[\s\S]*?audio:\s*\[\{[\s\S]*?url:\s*["']([^"']+\.(m4a|mp3))["']/i);
            if (audioMatch && audioMatch[1]) {
                audioUrl = audioMatch[1];
                if (audioUrl.startsWith('http://')) {
                    audioUrl = audioUrl.replace('http://', 'https://');
                }
            }
            return {
                url: audioUrl || input,
                parse: 0
            };
        } catch (e) {
            console.log('音频提取失败:', e);
            return {
                url: input,
                parse: 0
            };
        }
    }),
    play_parse: false, 
    sniffer: 0
};
