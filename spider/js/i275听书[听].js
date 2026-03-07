/*
@header({
  searchable: 1,
  filterable: 0,
  quickSearch: 0,
  title: 'i275听书网',
  '类型': '听书',
  lang: 'ds'
})
*/
var rule = {
    title: '275听书网',
    类型: '听书',
    host: 'https://m.i275.com',
    homeUrl: '/',
    url: '/',
    searchUrl: '/search.php?q=**&page=fypage',
    searchable: 1,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'MOBILE_UA',
        'Referer': 'https://m.i275.com/'
    },
    timeout: 5000,
    class_name: '',
    class_url: '',
    play_parse: true,
    lazy: '',
    推荐: '*',  // 用一级代替推荐
    一级: `js:
    let d = [];
    let html = request(input);
    
    // 匹配最近上架的书籍
    let reg = /<a[^>]*href="(\/book\/\d+\.html)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*font-medium[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?<div[^>]*class="[^"]*text-xs[^"]*"[^>]*>([^<]+)<\/div>/g;
    
    let match;
    while ((match = reg.exec(html)) !== null) {
        let href = match[1];
        let img = match[2];
        let title = match[3];
        let desc = match[4];
        
        if (href) {
            if (!href.startsWith('http')) {
                href = rule.host + href;
            }
            d.push({
                title: title,
                img: img,
                desc: desc,
                url: href
            });
        }
    }
    
    // 如果上面的正则没匹配到，用备选方案
    if (d.length === 0) {
        let items = html.match(/<a[^>]*href="\/book\/\d+\.html"[^>]*>[\s\S]*?<\/a>/g);
        if (items) {
            items.forEach(item => {
                let href = item.match(/href="([^"]+)"/)?.[1] || '';
                let img = item.match(/<img[^>]*src="([^"]+)"[^>]*>/)?.[1] || '';
                let title = item.match(/<div[^>]*class="[^"]*font-medium[^"]*"[^>]*>([^<]+)<\/div>/)?.[1] || '';
                let desc = item.match(/<div[^>]*class="[^"]*text-xs[^"]*"[^>]*>([^<]+)<\/div>/)?.[1] || '';
                
                if (href && title) {
                    if (!href.startsWith('http')) {
                        href = rule.host + href;
                    }
                    d.push({
                        title: title,
                        img: img,
                        desc: desc,
                        url: href
                    });
                }
            });
        }
    }
    
    VODS = d;
    `,
    二级: `js:
    let html = request(input);
    let title = jsp.pdfh(html, 'h1&&Text');
    let img = jsp.pdfa(html, '.w-32 img&&src');
    if (!img) img = jsp.pdfa(html, 'img[src*="imagev2"]&&src');
    
    // 获取详细信息
    let author = jsp.pdfh(html, 'p:contains(作者)&&Text').replace('作者：', '').replace('作者', '').trim();
    let narrator = jsp.pdfh(html, 'p:contains(演播)&&Text').replace('演播：', '').replace('演播', '').trim();
    let status = jsp.pdfh(html, 'p:contains(状态)&&Text').replace('状态：', '').trim();
    let content = jsp.pdfh(html, '.bg-white p.text-gray-600&&Text');
    
    // 组合描述
    let desc = '';
    if (narrator) desc += '演播:' + narrator;
    if (author) {
        if (desc) desc += ' | ';
        desc += '作者:' + author;
    }
    if (status) {
        if (desc) desc += ' | ';
        desc += status;
    }
    
    // 获取章节列表
    let tabs = ['正文目录'];
    let lists = [];
    let episodes = jsp.pj(html, '.grid a[href^="/play/"]');
    if (episodes.length === 0) {
        episodes = jsp.pj(html, 'a[href*="/play/"]');
    }
    
    episodes.forEach((ep, index) => {
        let chapterTitle = jsp.pdfh(ep, 'span.text-sm,span.truncate&&Text');
        if (!chapterTitle) {
            chapterTitle = jsp.pdfh(ep, 'Text').replace(/^\d+\.\s*/, '').trim();
        }
        let href = jsp.pdfa(ep, 'a&&href');
        if (href && !href.startsWith('http')) {
            href = rule.host + href;
        }
        if (chapterTitle && href) {
            lists.push({
                title: chapterTitle || '第' + (index + 1) + '章',
                url: href
            });
        }
    });
    
    VOD = {
        title: title,
        img: img,
        desc: desc,
        content: content,
        tabs: tabs,
        lists: lists
    };
    `,
    搜索: `js:
    let d = [];
    let html = request(input);
    let list = jsp.pj(html, '.divide-y a[href^="/book/"]');
    
    list.forEach(it => {
        let title = jsp.pdfh(it, 'h3&&Text');
        let img = jsp.pdfa(it, '.w-20 img&&src');
        let narrator = jsp.pdfh(it, 'p:contains(演播)&&Text').replace('演播', '').replace(/\s+/g, '').trim();
        let author = jsp.pdfh(it, 'p:contains(作者)&&Text').replace('作者', '').replace(/\s+/g, '').trim();
        let descText = jsp.pdfh(it, 'p.text-gray-400&&Text');
        
        let desc = '';
        if (narrator) desc += '演播:' + narrator;
        if (author) {
            if (desc) desc += ' | ';
            desc += '作者:' + author;
        }
        
        let href = jsp.pdfa(it, 'a&&href');
        if (href && !href.startsWith('http')) {
            href = rule.host + href;
        }
        
        d.push({
            title: title,
            img: img,
            desc: desc,
            content: descText,
            url: href
        });
    });
    
    VODS = d;
    `,
    lazy: `js:
    let html = request(input);
    let audioUrl = '';
    
    // 从APlayer配置中提取
    let matches = html.match(/url: ['"]([^'"]+\.m4a[^'"]*)['"]/);
    if (matches) audioUrl = matches[1];
    
    // 查找audio标签
    if (!audioUrl) {
        let audioMatch = html.match(/<audio[^>]*src=['"]([^'"]+)['"]/);
        if (audioMatch) audioUrl = audioMatch[1];
    }
    
    // 查找xmcdn链接
    if (!audioUrl) {
        let xmcdnMatch = html.match(/https?:\/\/[^"'\s]+\.xmcdn\.com[^"'\s]+\.m4a[^"'\s]*/);
        if (xmcdnMatch) audioUrl = xmcdnMatch[0];
    }
    
    if (audioUrl) {
        if (!audioUrl.startsWith('http')) {
            audioUrl = 'https:' + audioUrl;
        }
        audioUrl = audioUrl.replace(/['"]/g, '');
        input = audioUrl;
    } else {
        input = '';
    }
    `,
    sniffer: 1,
    isVideo: 'https?://[^"\\s]+\\.(m4a|mp3|aac|m3u8)'
}
