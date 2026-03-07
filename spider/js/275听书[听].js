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
    // 基础配置
    类型: '听书', 
    title: '275听书[听]',
    编码: 'utf-8',
    host: 'https://m.i275.com', 
    homeUrl: '/', 
    url: '/', 
    searchUrl: '/search.php?q=**',
    
    // 功能开关
    searchable: 1,
    quickSearch: 1,
    filterable: 0, 
    timeout: 8000, 
    
    // 请求头配置
    headers: {
        'User-Agent': 'Mozilla/5.0 (Mobile; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://m.i275.com/'
    },
    
    // 列表展示配置
    limit: 12, 
    hikerListCol: "avatar", 
    hikerClassListCol: "avatar",
    
    // 解析规则（全流程精准适配）
    // 1. 首页/推荐列表解析
    推荐: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    一级: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    
    // 2. 搜索结果解析
    搜索: $js.toString(() => {
        let lists = [];
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
        return lists;
    }),
    
    // 3. 书籍详情页解析（提取章节列表）
    二级: $js.toString(() => {
        let chapters = [];
        // 提取章节列表
        const chapterItems = html.querySelectorAll('.grid-cols-1 a[id^="chapter-pos-"]');
        chapterItems.forEach(item => {
            const chapterTitle = item.querySelector('span.text-gray-700')?.textContent?.trim() || '';
            const chapterHref = item.getAttribute('href') || '';
            
            if (chapterTitle && chapterHref) {
                chapters.push({
                    title: chapterTitle,
                    url: chapterHref.startsWith('/') ? rule.host + chapterHref : chapterHref
                });
            }
        });
        
        // 返回章节列表格式
        return {
            lists: chapters,
            pic: html.querySelector('div.w-32 img')?.src || '',
            desc: html.querySelector('.line-clamp-3')?.textContent?.trim() || ''
        };
    }),
    
    // 4. 播放页音频提取（终极版：精准匹配APlayer中的音频链接）
    lazy: $js.toString(async () => {
        // input为章节播放页链接
        try {
            // 第一步：请求播放页源码
            const playPageRes = await fetch(input, {
                headers: rule.headers,
                timeout: rule.timeout
            });
            const playHtml = await playPageRes.text();
            
            // 第二步：精准提取APlayer中的音频链接（核心正则）
            let audioUrl = '';
            // 匹配APlayer配置中的url字段（适配m4a/mp3等格式）
            const audioMatch = playHtml.match(/new APlayer\({[\s\S]*?audio:\s*\[\{[\s\S]*?url:\s*["']([^"']+\.(m4a|mp3))["']/i);
            
            if (audioMatch && audioMatch[1]) {
                audioUrl = audioMatch[1];
            }
            
            // 第三步：返回音频配置（确保有音频链接）
            return {
                url: audioUrl || input,
                parse: 0 // 本地解析，直接播放音频
            };
        } catch (e) {
            // 异常兜底
            console.log('音频提取失败：', e);
            return {
                url: input,
                parse: 0
            };
        }
    }),
    
    // 播放配置
    play_parse: false, 
    sniffer: 0
};
