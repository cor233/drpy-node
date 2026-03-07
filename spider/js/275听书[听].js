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
    类型: "听书",
    title: "275听书网",
    编码: "utf-8",
    host: "https://m.i275.com",
    homeUrl: "https://m.i275.com",
    url: "https://m.i275.com",
    searchUrl: "https://m.i275.com/search.php?q=**",
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    timeout: 10000,
    headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Referer": "https://m.i275.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    limit: 12,
    hikerListCol: "avatar",
    hikerClassListCol: "avatar",
    推荐: $js.toString(() => {
        let lists = [];
        try {
            const items = html.querySelectorAll(".grid a, .divide-y a");
            items.forEach(item => {
                const title = item.querySelector("div.font-medium, h3")?.textContent?.trim() || "";
                const pic = item.querySelector("img")?.src || "";
                const desc = item.querySelector("div.text-xs, p:first-of-type")?.textContent?.trim() || "未知";
                let href = item.getAttribute("href") || "";
                href = href.startsWith("/") ? rule.host + href : href;
                if (title && href) lists.push({title, pic, desc, url: href});
            });
        } catch (e) {}
        return lists;
    }),
    一级: $js.toString(() => {
        let lists = [];
        try {
            const items = html.querySelectorAll(".grid a, .divide-y a");
            items.forEach(item => {
                const title = item.querySelector("div.font-medium, h3")?.textContent?.trim() || "";
                const pic = item.querySelector("img")?.src || "";
                const actor = item.querySelector("p:first-of-type")?.textContent?.replace("演播", "").trim() || "未知演播";
                const author = item.querySelector("p:nth-of-type(2)")?.textContent?.replace("作者", "").trim() || "未知作者";
                let href = item.getAttribute("href") || "";
                href = href.startsWith("/") ? rule.host + href : href;
                if (title && href) lists.push({title, pic, desc: `${actor}|${author}`, url: href});
            });
        } catch (e) {}
        return lists;
    }),
    搜索: $js.toString(() => {
        let lists = [];
        try {
            const items = html.querySelectorAll(".divide-y a");
            items.forEach(item => {
                const title = item.querySelector("h3")?.textContent?.trim() || "";
                const pic = item.querySelector("img")?.src || "";
                const actor = item.querySelector("p:first-of-type")?.textContent?.replace("演播", "").trim() || "未知演播";
                const author = item.querySelector("p:nth-of-type(2)")?.textContent?.replace("作者", "").trim() || "未知作者";
                let href = item.getAttribute("href") || "";
                href = href.startsWith("/") ? rule.host + href : href;
                if (title && href) lists.push({title, pic, desc: `${actor}|${author}`, url: href});
            });
        } catch (e) {}
        return lists;
    }),
    // 核心修复：章节列表提取（覆盖所有可能的章节选择器）
    二级: $js.toString(() => {
        let result = {lists: [], pic: "", desc: ""};
        try {
            // 1. 提取书籍基础信息
            result.pic = html.querySelector("div.w-32 img, div.w-20 img, [alt*='封面']")?.src || "";
            result.desc = html.querySelector(".line-clamp-3, .line-clamp-2, [class*='desc'], p")?.textContent?.trim() || "暂无简介";
            
            // 2. 提取章节列表（关键：扩展所有可能的章节选择器）
            const chapterSelectors = [
                ".grid-cols-1 a[id^='chapter-pos-']",  // 原章节选择器
                ".grid-cols-1 a",                      // 兜底：grid布局下所有a标签
                ".divide-y a",                         // 兜底：分割线布局下所有a标签
                "a[href*='/play/']"                    // 核心：所有播放页链接（必中）
            ];
            
            let chapters = [];
            chapterSelectors.forEach(selector => {
                const items = html.querySelectorAll(selector);
                items.forEach((item, idx) => {
                    // 过滤非章节链接
                    if (!item.getAttribute("href")?.includes("/play/")) return;
                    
                    // 提取章节标题
                    let title = item.querySelector("span.text-gray-700, span, div")?.textContent?.trim() || "";
                    if (!title) title = `第${idx+1}章`; // 标题为空时兜底
                    
                    // 拼接完整链接
                    let href = item.getAttribute("href") || "";
                    href = href.startsWith("/") ? rule.host + href : href;
                    
                    // 避免重复章节
                    if (!chapters.some(c => c.url === href)) {
                        chapters.push({title, url: href});
                    }
                });
            });
            
            // 3. 强制兜底：至少返回1条章节数据
            result.lists = chapters.length > 0 ? chapters : [{
                title: "立即播放",
                url: html.querySelector("a[href*='/play/']")?.getAttribute("href") || rule.homeUrl
            }];
        } catch (e) {
            // 异常兜底
            result.lists = [{title: "暂无章节", url: rule.homeUrl}];
        }
        return result;
    }),
    lazy: $js.toString(async () => {
        let audioUrl = input;
        try {
            const res = await fetch(input, {headers: rule.headers, timeout: rule.timeout});
            const htmlStr = await res.text();
            const match = htmlStr.match(/new APlayer\({[\s\S]*?url:\s*["']([^"']+\.(m4a|mp3))["']/i);
            audioUrl = match ? (match[1].startsWith("/") ? rule.host + match[1] : match[1]) : input;
        } catch (e) {}
        return {url: audioUrl, parse: 0};
    }),
    play_parse: false,
    sniffer: 0
};
