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
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9"
    },
    limit: 12,
    hikerListCol: "avatar",
    hikerClassListCol: "avatar",
    // 推荐列表（首页）- 强制返回标准数组
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
    // 一级列表（分类/搜索结果）- 强制返回标准数组
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
    // 搜索解析 - 强制返回标准数组
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
    // 二级解析（书籍详情/章节列表）- 核心：返回详情数据结构
    二级: $js.toString(() => {
        let result = {lists: [], pic: "", desc: ""};
        try {
            // 提取书籍封面
            result.pic = html.querySelector("div.w-32 img, div.w-20 img")?.src || "";
            // 提取书籍简介
            result.desc = html.querySelector(".line-clamp-3, .line-clamp-2")?.textContent?.trim() || "暂无简介";
            // 提取章节列表（详情数据核心）
            const chapters = html.querySelectorAll(".grid-cols-1 a[id^='chapter-pos-']");
            chapters.forEach((item, idx) => {
                const title = item.querySelector("span.text-gray-700")?.textContent?.trim() || `第${idx+1}章`;
                let href = item.getAttribute("href") || "";
                href = href.startsWith("/") ? rule.host + href : href;
                if (title && href) result.lists.push({title, url: href});
            });
        } catch (e) {}
        // 兜底：至少返回空数组，避免「未找到详情数据」
        return result.lists.length > 0 ? result : {lists: [{title: "暂无章节", url: rule.homeUrl}], pic: "", desc: "暂无数据"};
    }),
    // 音频提取（播放页）
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
