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
    title: 'i275听书网',
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
    
    // 方法1: 从APlayer配置中提取音频URL (最精准)
    // 页面中有 new APlayer({...}) 配置，音频在 audio[0].url
    let matches = html.match(/url: ['"]([^'"]+\.m4a[^'"]*)['"]/);
    if (matches) {
        audioUrl = matches[1];
    }
    
    // 方法2: 如果找不到，尝试找完整的audio标签
    if (!audioUrl) {
        audioUrl = jsp.pdfh(html, 'audio&&src');
    }
    
    // 方法3: 尝试找音频链接的sign参数
    if (!audioUrl) {
        // 匹配类似：http://audiopay.cos.tx.xmcdn.com/download/... 的链接
        let audioMatches = html.match(/https?:\/\/[^"'\s]+\.xmcdn\.com[^"'\s]+\.m4a[^"'\s]*/);
        if (audioMatches) {
            audioUrl = audioMatches[0];
        }
    }
    
    // 方法4: 匹配任何m4a/mp3链接
    if (!audioUrl) {
        let genericMatches = html.match(/https?:\/\/[^"'\s]+\.(m4a|mp3|aac)[^"'\s]*/);
        if (genericMatches) {
            audioUrl = genericMatches[0];
        }
    }
    
    if (audioUrl) {
        // 确保URL完整
        if (!audioUrl.startsWith('http')) {
            audioUrl = 'https:' + audioUrl;
        }
        // 移除可能的引号
        audioUrl = audioUrl.replace(/['"]/g, '');
        input = audioUrl;
        print('找到音频: ' + audioUrl);
    } else {
        print('未找到音频链接');
        input = '';
    }
    `,
    一级: `js:
    let d = [];
    let html = request(input);
    let list = jsp.pj(html, 'a[href^="/book/"]:has(img)');
    list.forEach(it => {
        let title = jsp.pdfh(it, 'div.font-medium,div.truncate&&Text');
        let img = jsp.pdfa(it, 'img&&src');
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
    二级: `js:
    let html = request(input);
    
    // 书名
    let title = jsp.pdfh(html, 'h1&&Text');
    
    // 封面图
    let img = jsp.pdfa(html, '.w-32 img,img[src*="imagev2"]&&src');
    
    // 作者信息
    let author = jsp.pdfh(html, 'p:contains(作者) span,p:contains(作者)&&Text');
    author = (author || '').replace('作者：', '').replace('作者', '').trim();
    
    // 演播信息
    let narrator = jsp.pdfh(html, 'p:contains(演播) span,p:contains(演播)&&Text');
    narrator = (narrator || '').replace('演播：', '').replace('演播', '').trim();
    
    // 状态
    let status = jsp.pdfh(html, 'p:contains(状态) span,span.text-purple-600&&Text');
    
    // 简介
    let content = jsp.pdfh(html, '.bg-white p.text-gray-600&&Text');
    
    // 组合描述
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
    
    // 获取章节列表
    let tabs = ['正文目录'];
    let lists = [];
    
    // 从.grid容器中获取所有章节链接
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
    // 辅助嗅探
    sniffer: 1,
    isVideo: 'https?://[^"\\s]+\\.(m4a|mp3|aac|m3u8)'
}
