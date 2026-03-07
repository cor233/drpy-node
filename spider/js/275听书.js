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
    class_name: '最近上架',  // 必须有分类
    class_url: 'latest',     // 必须有对应标识
    play_parse: true,
    lazy: '',
    // 一级处理首页列表
    一级: `js:
    let d = [];
    let html = request(input);
    
    // 直接匹配所有书籍链接
    let items = html.match(/<a[^>]*href="(\/book\/\d+\.html)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*font-medium[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?<div[^>]*class="[^"]*text-xs[^"]*"[^>]*>([^<]+)<\/div>/g);
    
    if (items) {
        items.forEach(item => {
            let href = item.match(/href="([^"]+)"/)?.[1] || '';
            let img = item.match(/src="([^"]+)"/)?.[1] || '';
            let title = item.match(/font-medium[^>]*>([^<]+)/)?.[1] || '';
            let desc = item.match(/text-xs[^>]*>([^<]+)/)?.[1] || '';
            
            if (href && title) {
                if (!href.startsWith('http')) {
                    href = rule.host + href;
                }
                d.push({
                    title: title.trim(),
                    img: img,
                    desc: desc.trim(),
                    url: href,
                    id: href.split('/').pop().replace('.html', '')
                });
            }
        });
    }
    
    VODS = d;
    `,
    // 详情页
    二级: `js:
    let html = request(input);
    let title = html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] || '';
    let img = html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*w-32[^"]*"/)?.[1] || '';
    if (!img) {
        img = html.match(/<img[^>]*src="([^"]+imagev2[^"]+)"[^>]*>/)?.[1] || '';
    }
    
    // 章节列表
    let tabs = ['正文目录'];
    let lists = [];
    
    // 匹配所有章节
    let chapterRegex = /<a[^>]*href="(\/play\/\d+\/\d+\.html)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*text-sm[^"]*"[^>]*>([^<]+)<\/span>/g;
    let match;
    while ((match = chapterRegex.exec(html)) !== null) {
        let href = match[1];
        let chapterTitle = match[2].trim();
        
        if (href) {
            if (!href.startsWith('http')) {
                href = rule.host + href;
            }
            lists.push({
                title: chapterTitle,
                url: href
            });
        }
    }
    
    VOD = {
        title: title,
        img: img,
        tabs: tabs,
        lists: lists
    };
    `,
    // 搜索
    搜索: `js:
    let d = [];
    let html = request(input);
    
    let items = html.match(/<a[^>]*href="(\/book\/\d+\.html)"[^>]*class="flex[^"]*p-4[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/g);
    
    if (items) {
        items.forEach(item => {
            let href = item.match(/href="([^"]+)"/)?.[1] || '';
            let title = item.match(/<h3[^>]*>([^<]+)<\/h3>/)?.[1] || '';
            let img = item.match(/src="([^"]+)"/)?.[1] || '';
            
            if (href && title) {
                if (!href.startsWith('http')) {
                    href = rule.host + href;
                }
                d.push({
                    title: title.trim(),
                    img: img,
                    url: href,
                    id: href.split('/').pop().replace('.html', '')
                });
            }
        });
    }
    
    VODS = d;
    `,
    // 播放
    lazy: `js:
    let html = request(input);
    let audioUrl = '';
    
    // 从APlayer配置中提取
    let matches = html.match(/url: ['"]([^'"]+\.m4a[^'"]*)['"]/);
    if (matches) {
        audioUrl = matches[1];
    }
    
    if (audioUrl) {
        if (!audioUrl.startsWith('http')) {
            audioUrl = 'https:' + audioUrl;
        }
        input = audioUrl.replace(/['"]/g, '');
    } else {
        input = '';
    }
    `
}
