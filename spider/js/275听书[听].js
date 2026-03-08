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
    title: '275听书网',
    host: 'https://www.i275.com',
    类型: '听书',
    编码: 'utf-8',
    homeUrl: '/',
    class_name: '最新上架',
    class_url: 'latest',
    url: '/?page=fypage',
    searchUrl: '/search.php?q=**&page=fypage',
    searchable: 1,
    quickSearch: 1,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    timeout: 5000,
    play_parse: true,
    预处理: async function () {
        let homeHtml = await request(this.host);
        let cookie = homeHtml.match(/set-cookie: ([^;]+)/i) || '';
        this.headers.Cookie = cookie;
    },
    推荐: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    一级: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    二级: async function () {
        let html = await request(this.input);
        let title = pdfh(html, 'h1.text-2xl&&Text') || pdfh(html, 'h1&&Text') || '';
        let img = pdfh(html, '.w-32.h-44 img&&src') || pdfh(html, 'meta[property="og:image"]&&content') || '';
        let author = pdfh(html, 'p:contains("作者：") span&&Text') || '';
        let narrator = pdfh(html, 'p:contains("演播：") span&&Text') || '';
        let desc = pdfh(html, '.bg-white.p-4 p.text-gray-600&&Text') || pdfh(html, 'meta[name="description"]&&content') || '';
        let tabs = [], lists = [];
        let chapterItems = pdfa(html, 'a[href*="/play/"]');
        if (chapterItems.length === 0) {
            chapterItems = pdfa(html, 'a[id^="chapter-pos-"]');
        }
        chapterItems.forEach(item => {
            let name = pdfh(item, 'span.text-sm.truncate&&Text') || pdfh(item, 'span.text-sm&&Text') || pdfh(item, 'a&&Text') || '第' + (lists.length+1) + '集';
            let url = pdfh(item, 'a&&href');
            if (name && url) {
                url = urljoin(this.host, url);
                lists.push({ name, url });
            }
        });
        if (lists.length) {
            tabs.push({ name: '默认线路', lists });
        }
        let fullDesc = `作者：${author} 演播：${narrator}\n${desc}`.trim();
        return { title, img, desc: fullDesc, tabs };
    },
    搜索: async function () {
        let html = await request(this.input);
        let result = [];
        let items = pdfa(html, '.bg-white .divide-y a');
        items.forEach(item => {
            let title = pdfh(item, 'h3&&Text');
            let img = pdfh(item, 'img&&src');
            let narrator = '', author = '';
            let pNodes = pdfa(item, 'p');
            pNodes.forEach(p => {
                let spanText = pdfh(p, 'span.bg-gray-100&&Text');
                let text = pdfh(p, 'Text', 1);
                if (spanText.includes('演播')) {
                    narrator = text;
                } else if (spanText.includes('作者')) {
                    author = text;
                }
            });
            let desc = `演播：${narrator} 作者：${author}`.replace(/\s+/g, ' ').trim();
            let link = pdfh(item, 'a&&href');
            if (title && link) {
                link = urljoin(this.host, link);
                result.push({ title, img, desc, link });
            }
        });
        return result;
    },
    lazy: async function () {
        let url = this.input;
        if (/\.(mp3|m4a|aac|flac|m3u8)$/i.test(url)) {
            return { url, parse: 0 };
        }
        let html = await request(url);
        let match = html.match(/url:\s*'([^']+)'/);
        if (match) {
            let audioUrl = match[1];
            audioUrl = urljoin(url, audioUrl);
            return { url: audioUrl, parse: 0 };
        }
        let audioSrc = pdfh(html, 'audio&&src');
        if (audioSrc) {
            audioSrc = urljoin(url, audioSrc);
            return { url: audioSrc, parse: 0 };
        }
        let matches = html.match(/https?:[^"'\s]+\.(mp3|m4a|aac|flac)/i);
        if (matches) {
            return { url: matches[0], parse: 0 };
        }
        return { url, parse: 1 };
    }
};
