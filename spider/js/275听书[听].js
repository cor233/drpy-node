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
    host: 'https://m.i275.com',          // 优先使用移动端域名（若无效请改回 www.i275.com）
    类型: '听书',
    编码: 'utf-8',
    homeUrl: '/',
    class_name: '最新上架',
    class_url: 'latest',
    url: '/?page=fypage',                 // 分类页分页链接（需确认实际分页参数）
    searchUrl: '/search.php?q=**&page=fypage', // 搜索分页
    searchable: 1,
    quickSearch: 1,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36'
    },
    timeout: 5000,
    play_parse: true,

    // 首页推荐（与一级相同，基于主站结构）
    推荐: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',

    // 一级列表（分类页列表）
    一级: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',

    // 二级详情（提取书籍信息及章节列表）
    二级: async function () {
        let html = await request(this.input);
        // 基本信息
        let title = pdfh(html, 'h1.text-2xl&&Text') || pdfh(html, 'meta[property="og:title"]&&content') || '';
        let img = pdfh(html, '.w-32.h-44 img&&src') || pdfh(html, 'meta[property="og:image"]&&content') || '';
        let author = pdfh(html, 'p:contains("作者：") span&&Text') || '';
        let narrator = pdfh(html, 'p:contains("演播：") span&&Text') || '';
        let desc = pdfh(html, '.bg-white.p-4 p.text-gray-600&&Text') || pdfh(html, 'meta[name="description"]&&content') || '';

        // 章节列表提取（适配多种选择器）
        let chapterItems = [];
        chapterItems = pdfa(html, '.grid.grid-cols-1 a[id^="chapter-pos-"]');
        if (chapterItems.length === 0) {
            chapterItems = pdfa(html, '.divide-y a[href^="/play/"]');
        }
        if (chapterItems.length === 0) {
            chapterItems = pdfa(html, 'a[href*="/play/"]');
        }

        let lists = [];
        chapterItems.forEach(item => {
            let name = pdfh(item, 'span.text-sm&&Text') || pdfh(item, 'span:last-child&&Text') || item.textContent.trim();
            let url = pdfh(item, 'href');
            if (url && name) {
                url = urljoin(HOST, url);
                lists.push({ name, url });
            }
        });

        // 去重
        let uniqueLists = [];
        let seenUrls = new Set();
        lists.forEach(item => {
            if (!seenUrls.has(item.url)) {
                seenUrls.add(item.url);
                uniqueLists.push(item);
            }
        });

        let tabs = uniqueLists.length ? [{ name: '默认线路', lists: uniqueLists }] : [];
        let fullDesc = `作者：${author} 演播：${narrator}\n${desc}`.trim();
        return { title, img, desc: fullDesc, tabs };
    },

    // 搜索（基于搜索结果页）
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
                if (spanText.includes('演播')) narrator = text;
                if (spanText.includes('作者')) author = text;
            });
            let desc = `演播：${narrator} 作者：${author}`.replace(/\s+/g, ' ').trim();
            let link = pdfh(item, 'a&&href');
            if (title && link) {
                link = urljoin(HOST, link);
                result.push({ title, img, desc, link });
            }
        });
        return result;
    },

    // lazy 获取真实音频链接
    lazy: async function () {
        let url = this.input;
        if (/\.(mp3|m4a|aac|flac|m3u8)$/i.test(url)) {
            return { url, parse: 0 };
        }
        let html = await request(url);
        // 提取 APlayer 初始化中的音频链接
        let match = html.match(/url:\s*'([^']+)'/);
        if (match) {
            let audioUrl = match[1];
            audioUrl = urljoin(url, audioUrl);
            return { url: audioUrl, parse: 0 };
        }
        // 尝试 audio 标签
        let audioSrc = pdfh(html, 'audio&&src');
        if (audioSrc) {
            audioSrc = urljoin(url, audioSrc);
            return { url: audioSrc, parse: 0 };
        }
        // 正则匹配常见音频格式
        let matches = html.match(/https?:[^"'\s]+\.(mp3|m4a|aac|flac)/i);
        if (matches) {
            return { url: matches[0], parse: 0 };
        }
        return { url, parse: 1 };
    }
};
