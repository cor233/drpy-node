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
    url: '/booklist/fyclass_fypage.html',
    detailUrl: '/book/fyid.html',
    searchUrl: '/search.php?q=**&page=fypage',
    searchable: 1,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'MOBILE_UA',
        'Referer': 'https://m.i275.com/'
    },
    timeout: 5000,
    class_name: '热门小说&玄幻奇幻&武侠仙侠&都市言情&历史军事&恐怖灵异&科幻游戏&悬疑推理',
    class_url: 'hot&xuanhuan&wuxia&dushi&lishi&kongbu&keji&xuanyi',
    play_parse: true,
    lazy: `js:
    let playUrl = input;
    let html = request(playUrl);
    let audioUrl = '';
    
    // 从APlayer配置中提取音频URL
    let matches = html.match(/url: ['"]([^'"]+\.m4a[^'"]*)['"]/);
    if (matches) {
        audioUrl = matches[1];
    }
    
    if (!audioUrl) {
        audioUrl = jsp.pdfh(html, 'audio&&src');
    }
    
    if (!audioUrl) {
        let audioMatches = html.match(/https?:\/\/[^"'\s]+\.xmcdn\.com[^"'\s]+\.m4a[^"'\s]*/);
        if (audioMatches) {
            audioUrl = audioMatches[0];
        }
    }
    
    if (!audioUrl) {
        let genericMatches = html.match(/https?:\/\/[^"'\s]+\.(m4a|mp3|aac)[^"'\s]*/);
        if (genericMatches) {
            audioUrl = genericMatches[0];
        }
    }
    
    if (audioUrl) {
        if (!audioUrl.startsWith('http')) {
            audioUrl = 'https:' + audioUrl;
        }
        audioUrl = audioUrl.replace(/['"]/g, '');
        input = audioUrl;
        print('找到音频: ' + audioUrl);
    } else {
        print('未找到音频链接');
        input = '';
    }
    `,
    // 推荐接口 - 首页最近上架
    推荐: `js:
    let d = [];
    let html = request(input);
    // 定位最近上架区域的grid容器
    let list = jsp.pj(html, '.grid a[href^="/book/"]');
    if (list.length === 0) {
        list = jsp.pj(html, 'a[href*="/book/"]:has(img)');
    }
    list.forEach(it => {
        let title = jsp.pdfh(it, 'div.font-medium,div.truncate&&Text');
        let img = jsp.pdfa(it, 'img&&src');
        // 描述信息：演播名称
        let desc = jsp.pdfh(it, 'div.text-xs,div.text-gray-500&&Text');
        let href = jsp.pdfa(it, 'a&&href');
        if (href && !href.startsWith('http')) {
            href = rule.host + href;
        }
        d.push({
            title: title,
            img: img,
            desc: desc,
            url: href
        });
    });
    VODS = d;
    `,
    // 一级接口 - 分类列表页
    一级: `js:
    let d = [];
    let html = request(input);
    // 分类页可能的结构
    let list = jsp.pj(html, 'a[href*="/book/"]:has(img)');
    if (list.length === 0) {
        list = jsp.pj(html, '.book-item,.list-item');
    }
    list.forEach(it => {
        let title = jsp.pdfh(it, 'h3,h2,div.title,div.name,div.font-medium,div.truncate&&Text');
        let img = jsp.pdfa(it, 'img&&src');
        let desc = jsp.pdfh(it, 'p,div.desc,div.info,div.text-xs,div.text-gray-500&&Text');
        let href = jsp.pdfa(it, 'a&&href');
        if (href && !href.startsWith('http')) {
            href = rule.host + href;
        }
        if (title && href) {
            d.push({
                title: title,
                img: img || '',
                desc: desc || '',
                url: href
            });
        }
    });
    VODS = d;
    `,
    二级: `js:
    let html = request(input);
    
    let title = jsp.pdfh(html, 'h1&&Text');
    let img = jsp.pdfa(html, '.w-32 img,img[src*="imagev2"]&&src');
    
    let author = jsp.pdfh(html, 'p:contains(作者) span,p:contains(作者)&&Text');
    author = (author || '').replace('作者：', '').replace('作者', '').trim();
    
    let narrator = jsp.pdfh(html, 'p:contains(演播) span,p:contains(演播)&&Text');
    narrator = (narrator || '').replace('演播：', '').replace('演播', '').trim();
    
    let status = jsp.pdfh(html, 'p:contains(状态) span,span.text-purple-600&&Text');
    let content = jsp.pdfh(html, '.bg-white p.text-gray-600&&Text');
    
    let desc = '';
    if (narrator) desc += '🎙️ ' + narrator;
    if (author) {
        if (desc) desc += ' · ';
        desc += '✍️ ' + author;
    }
    if (status) {
        if (desc) desc += ' · ';
        desc += '📌 ' + status;
    }
    
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
                title: chapterTitle,
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
        
        let narrator = jsp.pdfh(it, 'p:contains(演播)&&Text');
        narrator = (narrator || '').replace('演播', '').replace(/\s+/g, '').trim();
        
        let author = jsp.pdfh(it, 'p:contains(作者)&&Text');
        author = (author || '').replace('作者', '').replace(/\s+/g, '').trim();
        
        let descText = jsp.pdfh(it, 'p.text-gray-400&&Text');
        
        let desc = '';
        if (narrator) desc += narrator;
        if (author) {
            if (desc) desc += ' · ';
            desc += author;
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
    sniffer: 1,
    isVideo: 'https?://[^"\\s]+\\.(m4a|mp3|aac|m3u8)'
}
