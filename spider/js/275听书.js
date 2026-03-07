/*
@header({
  searchable: 1,
  filterable: 0,
  quickSearch: 0,
  title: '275听书网',
  '类型': '听书',
  lang: 'ds'
})
*/
var rule = {
    title: '275听书网',
    host: 'https://m.i275.com',
    url: '/',
    searchUrl: '/search.php?q=**',
    searchable: 1,
    quickSearch: 1,
    headers: {
        'User-Agent': 'MOBILE_UA'
    },
    class_name: '最近上架',
    class_url: 'latest',
    play_parse: true,
    lazy: '',
    一级: `js:
    let d = [];
    let html = request(input);
    
    // 匹配所有书籍链接
    let items = jsp.pj(html, '.grid a[href^="/book/"]');
    items.forEach(it => {
        let title = jsp.pdfh(it, 'div.font-medium&&Text');
        let img = jsp.pdfa(it, 'img&&src');
        let desc = jsp.pdfh(it, 'div.text-xs&&Text');
        let href = jsp.pdfa(it, 'a&&href');
        
        if (title && href) {
            d.push({
                title: title,
                img: img,
                desc: desc,
                url: href
            });
        }
    });
    
    VODS = d;
    `,
    二级: `js:
    let html = request(input);
    let title = jsp.pdfh(html, 'h1&&Text');
    let img = jsp.pdfa(html, '.w-32 img&&src');
    if (!img) img = jsp.pdfa(html, 'img[src*="imagev2"]&&src');
    
    // 获取章节列表
    let tabs = ['正文目录'];
    let lists = [];
    let episodes = jsp.pj(html, '.grid a[href^="/play/"]');
    
    episodes.forEach((ep, index) => {
        let chapterTitle = jsp.pdfh(ep, 'span.text-sm&&Text');
        let href = jsp.pdfa(ep, 'a&&href');
        if (href) {
            lists.push({
                title: chapterTitle || '第' + (index + 1) + '章',
                url: href
            });
        }
    });
    
    VOD = {
        title: title,
        img: img,
        tabs: tabs,
        lists: lists
    };
    `,
    搜索: `js:
    let d = [];
    let html = request(input);
    let items = jsp.pj(html, '.divide-y a[href^="/book/"]');
    
    items.forEach(it => {
        let title = jsp.pdfh(it, 'h3&&Text');
        let img = jsp.pdfa(it, '.w-20 img&&src');
        let href = jsp.pdfa(it, 'a&&href');
        
        if (title && href) {
            d.push({
                title: title,
                img: img,
                url: href
            });
        }
    });
    
    VODS = d;
    `,
    lazy: `js:
    let html = request(input);
    let audioUrl = '';
    
    // 从APlayer配置中提取音频URL
    let matches = html.match(/url: ['"]([^'"]+\.m4a[^'"]*)['"]/);
    if (matches) audioUrl = matches[1];
    
    if (audioUrl) {
        input = audioUrl;
    }
    `
}
