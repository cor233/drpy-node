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
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.i275.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
    },
    limit: 12,
    hikerListCol: "avatar",
    hikerClassListCol: "avatar",
    推荐: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    一级: '.grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href',
    搜索: $js.toString(() => {
        let lists = [];
        try {
            const items = html.querySelectorAll('.divide-y a');
            items.forEach(item => {
                const title = item.querySelector('h3')?.textContent?.trim() || '';
                const cover = item.querySelector('img')?.src || '';
                const actor = item.querySelector('p:first-of-type')?.textContent?.replace('演播', '').trim() || '未知演播';
                const author = item.querySelector('p:nth-of-type(2)')?.textContent?.replace('作者', '').trim() || '未知作者';
                const desc = `${actor} | ${author}`;
                let href = item.getAttribute('href') || '';
                if (href && !href.startsWith('http')) {
                    href = href.startsWith('/') ? rule.host + href : rule.host + '/' + href;
                }
                if (title && href) {
                    lists.push({
                        title: title,
                        pic: cover,
                        desc: desc,
                        url: href
                    });
                }
            });
        } catch (e) {}
        return lists;
    }),
    二级: $js.toString(() => {
        let chapters = [];
        let bookPic = '';
        let bookDesc = '';
        try {
            // 精准匹配章节链接（基于你提供的HTML结构）
            const chapterLinks = html.querySelectorAll('a[id^="chapter-pos-"]');
            if (chapterLinks.length > 0) {
                chapterLinks.forEach(link => {
                    const href = link.getAttribute('href') || '';
                    const text = link.textContent?.replace(/\d+\.\s*/, '').trim() || '';
                    if (href.includes('/play/') && text) {
                        let fullHref = href;
                        if (!href.startsWith('http')) {
                            fullHref = href.startsWith('/') ? rule.host + href : rule.host + '/' + href;
                        }
                        chapters.push({
                            title: text,
                            url: fullHref
                        });
                    }
                });
            } else {
                // 兜底采集（兼容其他布局）
                const allLinks = html.querySelectorAll('a');
                allLinks.forEach(link => {
                    const href = link.getAttribute('href') || '';
                    const text = link.textContent?.trim() || '';
                    if (href.includes('/play/') && text && text.length > 1 && !text.includes('上一页') && !text.includes('下一页')) {
                        let fullHref = href;
                        if (!href.startsWith('http')) {
                            fullHref = href.startsWith('/') ? rule.host + href : rule.host + '/' + href;
                        }
                        chapters.push({
                            title: text,
                            url: fullHref
                        });
                    }
                });
            }
            
            // 解析封面
            const coverImg = html.querySelector('div.w-32 img, div.book-cover img');
            bookPic = coverImg?.src || '';
            
            // 解析简介
            const introEl = html.querySelector('.line-clamp-3');
            bookDesc = introEl?.textContent?.trim() || '暂无简介';
        } catch (e) {}
        return {
            lists: chapters.length > 0 ? chapters : [{ title: '暂无章节', url: input }],
            pic: bookPic,
            desc: bookDesc
        };
    }),
    // 核心修复：增强播放源解析逻辑
    lazy: $js.toString(async () => {
        // 增强版请求函数（带重试和超时）
        const fetchWithRetry = async (url, options, maxRetries = 4, delay = 2000) => {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + delay * i));
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), rule.timeout);
                    
                    const res = await fetch(url, {
                        ...options,
                        signal: controller.signal,
                        cache: 'no-store'
                    });
                    clearTimeout(timeoutId);
                    
                    if (res.status >= 500 && i < maxRetries - 1) continue;
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res;
                } catch (e) {
                    if (i === maxRetries - 1) throw e;
                }
            }
        };

        try {
            // 1. 请求播放页内容
            const playPageRes = await fetchWithRetry(input, { headers: rule.headers });
            const playHtml = await playPageRes.text();
            
            // 2. 增强版音频URL正则匹配（覆盖更多格式）
            const audioPatterns = [
                // 基础格式
                /url\s*[:=]\s*["']([^"']+\.(m4a|mp3|aac|wav|ogg))["']/i,
                /src\s*[:=]\s*["']([^"']+\.(m4a|mp3|aac|wav|ogg))["']/i,
                /audio\s*[:=]\s*["']([^"']+\.(m4a|mp3|aac|wav|ogg))["']/i,
                /file\s*[:=]\s*["']([^"']+\.(m4a|mp3|aac|wav|ogg))["']/i,
                // 特殊格式（可能被转义）
                /https?:\/\/[^\s"']+\.(m4a|mp3|aac|wav|ogg)/i,
                /\/\/[^\s"']+\.(m4a|mp3|aac|wav|ogg)/i,
                // JS变量格式
                /var\s+audioUrl\s*=\s*["']([^"']+\.(m4a|mp3))["']/i,
                /let\s+audioSrc\s*=\s*["']([^"']+\.(m4a|mp3))["']/i,
                /const\s+playUrl\s*=\s*["']([^"']+\.(m4a|mp3))["']/i
            ];

            let audioUrl = '';
            // 遍历所有正则，匹配到即停止
            for (let pattern of audioPatterns) {
                const match = playHtml.match(pattern);
                if (match && match[1]) {
                    audioUrl = match[1];
                    break;
                }
            }

            // 3. 处理音频URL格式（补全协议、转换http到https）
            if (audioUrl) {
                if (audioUrl.startsWith('//')) {
                    audioUrl = 'https:' + audioUrl;
                } else if (audioUrl.startsWith('http://')) {
                    audioUrl = audioUrl.replace('http://', 'https://');
                } else if (!audioUrl.startsWith('http')) {
                    // 处理相对路径
                    audioUrl = audioUrl.startsWith('/') 
                        ? rule.host + audioUrl 
                        : rule.host + '/' + audioUrl;
                }
            }

            // 4. 返回解析结果（兜底返回原URL）
            return { 
                url: audioUrl || input, 
                parse: audioUrl ? 0 : 1  // 有音频URL则不二次解析，无则尝试二次解析
            };
        } catch (e) {
            // 异常兜底
            return { url: input, parse: 1 };
        }
    }),
    play_parse: false,
    sniffer: 0
};
