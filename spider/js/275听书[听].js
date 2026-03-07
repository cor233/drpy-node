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
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.i275.com/'
    },
    limit: 12,
    hikerListCol: "avatar",
    hikerClassListCol: "avatar",
    推荐: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    一级: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    搜索: $js.toString(() => {
        let lists = [];
        const items = html.querySelectorAll('.divide-y a');
        items.forEach(item => {
            const title = item.querySelector('h3')?.textContent?.trim() || '';
            const cover = item.querySelector('img')?.src || '';
            const actor = item.querySelector('p:first-of-type')?.textContent?.replace('演播', '').trim() || '';
            const author = item.querySelector('p:nth-of-type(2)')?.textContent?.replace('作者', '').trim() || '';
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
        return lists;
    }),
    二级: $js.toString(() => {
        let chapters = [];
        const chapterItems = html.querySelectorAll('a[id^="chapter-pos-"]');
        chapterItems.forEach(item => {
            const chapterTitle = item.textContent?.trim() || '';
            const chapterHref = item.getAttribute('href') || '';
            if (chapterTitle && chapterHref) {
                chapters.push({
                    title: chapterTitle,
                    url: chapterHref.startsWith('/') ? rule.host + chapterHref : chapterHref
                });
            }
        });
        return {
            lists: chapters,
            pic: html.querySelector('div.w-32 img')?.src || '',
            desc: html.querySelector('.line-clamp-3')?.textContent?.trim() || ''
        };
    }),
    lazy: $js.toString(async () => {
        const res = await fetch(input, { headers: rule.headers });
        const html = await res.text();
        const m = html.match(/url:\s*["']([^"']+)["']/i);
        return { url: m ? m[1] : input, parse: 0 };
    }),
    play_parse: false,
    sniffer: 0
};
