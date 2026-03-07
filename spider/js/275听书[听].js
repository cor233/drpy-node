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
    homeUrl: "https://m.i275.com/index.html",
    url: "https://m.i275.com/index.html",
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
    推荐: $js.toString(() => {
        let lists = [];
        try {
            const items = html.querySelectorAll(".grid a, .divide-y a");
            items.forEach(item => {
                const title = item.querySelector("div.font-medium, h3")?.textContent?.trim() || "";
                const pic = item.querySelector("img")?.src || "";
                const desc = item.querySelector("div.text-xs, p:first-of-type")?.textContent?.trim() || "未知";
                const href = item.getAttribute("href") || "";
                const url = href.startsWith("http") ? href : rule.host + href;
                if (title && url) lists.push({title, pic, desc, url});
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
                const desc = item.querySelector("div.text-xs, p:first-of-type")?.textContent?.trim() || "未知";
                const href = item.getAttribute("href") || "";
                const url = href.startsWith("http") ? href : rule.host + href;
                if (title && url) lists.push({title, pic, desc, url});
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
                const desc = `${actor} | ${author}`;
                const href = item.getAttribute("href") || "";
                const url = href.startsWith("http") ? href : rule.host + href;
                if (title && url) lists.push({title, pic, desc, url});
            });
        } catch (e) {}
        return lists;
    }),
    二级: $js.toString(() => {
        let lists = [];
        try {
            const items = html.querySelectorAll(".grid-cols-1 a[id^='chapter-pos-']");
            items.forEach(item => {
                const title = item.querySelector("span.text-gray-700")?.textContent?.trim() || "";
                const href = item.getAttribute("href") || "";
                const url = href.startsWith("http") ? href : rule.host + href;
                if (title && url) lists.push({title, url});
            });
        } catch (e) {}
        return {
            lists: lists,
            pic: html.querySelector("div.w-32 img")?.src || "",
            desc: html.querySelector(".line-clamp-3")?.textContent?.trim() || ""
        };
    }),
    lazy: $js.toString(async () => {
        try {
            const res = await fetch(input, {headers: rule.headers, timeout: rule.timeout});
            const html = await res.text();
            const match = html.match(/new APlayer\({[\s\S]*?url:\s*["']([^"']+\.(m4a|mp3))["']/i);
            const url = match ? (match[1].startsWith("http") ? match[1] : rule.host + match[1]) : input;
            return {url, parse: 0};
        } catch (e) {
            return {url: input, parse: 0};
        }
    }),
    play_parse: false,
    sniffer: 0
};
