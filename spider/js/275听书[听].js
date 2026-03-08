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
    // 静态分类（目前仅有“最新上架”，可自行扩展）
    class_name: '最新上架',
    class_url: 'latest',
    // 分类页分页链接（假设分页参数为page）
    url: '/?page=fypage',
    // 搜索链接（支持分页）
    searchUrl: '/search.php?q=**&page=fypage',
    searchable: 1,
    quickSearch: 1,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    timeout: 5000,
    play_parse: true,
    // 首页推荐（最新上架列表）
    推荐: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    // 一级列表（同推荐）
    一级: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    // 二级详情（提取书籍信息和章节列表）
    二级: async function () {
        let html = await request(this.input);
        // 标题
        let title = pdfh(html, 'h1.text-2xl&&Text') || pdfh(html, 'h1&&Text') || '';
        // 图片
        let img = pdfh(html, '.w-32.h-44 img&&src') || pdfh(html, 'meta[property="og:image"]&&content') || '';
        // 作者
        let author = pdfh(html, 'p:contains("作者：") span&&Text') || '';
        // 演播
        let narrator = pdfh(html, 'p:contains("演播：") span&&Text') || '';
        // 简介
        let desc = pdfh(html, '.bg-white.p-4 p.text-gray-600&&Text') || pdfh(html, 'meta[name="description"]&&content') || '';
        
        let tabs = [], lists = [];
        // 精准提取章节列表：所有id以"chapter-pos-"开头的a标签
        let chapterItems = pdfa(html, 'a[id^="chapter-pos-"]');
        // 兼容性备用选择器
        if (chapterItems.length === 0) {
            chapterItems = pdfa(html, '.grid a[href*="/play/"]');
        }
        chapterItems.forEach(item => {
            // 章节名称在span.text-sm.truncate中
            let name = pdfh(item, 'span.text-sm.truncate&&Text') || 
                       pdfh(item, 'a&&Text') || 
                       '第' + (lists.length+1) + '集';
            let url = pdfh(item, 'a&&href');
            if (name && url) {
                url = urljoin(HOST, url);
                lists.push({ name, url });
            }
        });
        if (lists.length) {
            tabs.push({ name: '默认线路', lists });
        }
        let fullDesc = `作者：${author} 演播：${narrator}\n${desc}`.trim();
        return { title, img, desc: fullDesc, tabs };
    },
    // 搜索（根据搜索结果页结构调整）
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
                // 获取span后面的文本节点（假设直接跟在span后面）
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
                link = urljoin(HOST, link);
                result.push({ title, img, desc, link });
            }
        });
        return result;
    },
    // lazy获取真实音频链接（从播放页提取）
    lazy: async function () {
        let url = this.input;
        // 如果已经是音频链接直接返回
        if (/\.(mp3|m4a|aac|flac|m3u8)$/i.test(url)) {
            return { url, parse: 0 };
        }
        let html = await request(url);
        // 方法1：提取 APlayer 初始化中的 audio url (格式: url: '...')
        let match = html.match(/url:\s*'([^']+)'/);
        if (match) {
            let audioUrl = match[1];
            audioUrl = urljoin(url, audioUrl);
            return { url: audioUrl, parse: 0 };
        }
        // 方法2：audio标签src
        let audioSrc = pdfh(html, 'audio&&src');
        if (audioSrc) {
            audioSrc = urljoin(url, audioSrc);
            return { url: audioSrc, parse: 0 };
        }
        // 方法3：正则匹配常见音频格式
        let matches = html.match(/https?:[^"'\s]+\.(mp3|m4a|aac|flac)/i);
        if (matches) {
            return { url: matches[0], parse: 0 };
        }
        // 兜底：让壳子嗅探
        return { url, parse: 1 };
    }
};
