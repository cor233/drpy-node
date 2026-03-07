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
    homeUrl: "/",
    url: "/",
    searchUrl: "/search.php?q=**",
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    timeout: 10000,
    headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Referer": "https://m.i275.com/"
    },
    limit: 12,
    hikerListCol: "avatar",
    hikerClassListCol: "avatar",
    推荐: ".grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href",
    一级: ".grid a;div.font-medium&&Text;img&&src;div.text-xs&&Text;a&&href",
    搜索: ".divide-y a;h3&&Text;img&&src;p:first-of-type&&Text;a&&href",
    二级: ".grid-cols-1 a[id^='chapter-pos-'];span.text-gray-700&&Text;a&&href",
    lazy: $js.toString(async ()=>{
        const r=await fetch(input,{headers:rule.headers});
        const t=await r.text();
        const m=t.match(/url:\s*["']([^"']+)["']/);
        return {url:m?m[1]:input,parse:0};
    }),
    play_parse: false,
    sniffer: 0
};
