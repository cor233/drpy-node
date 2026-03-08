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
    host: 'https://m.i275.com',
    homeUrl: '/',
    // 静态分类（只有“最近上架”一类）
    class_name: '最近上架',
    class_url: 'latest',
    url: '/',
    searchUrl: '/search.php?q=**',
    searchable: 1,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    timeout: 5000,
    play_parse: true,

    // ----- 懒加载：从播放页提取真实音频地址 -----
    lazy: async function () {
        let html = await request(this.input);
        let match = html.match(/url:\s*'([^']+)'/);
        if (match) {
            return {
                url: match[1],
                parse: 0,
                headers: { 'Referer': this.host }
            };
        }
        return {};
    },

    // ----- 首页推荐（最近上架）-----
    推荐: async function () {
        let html = await request(this.host);
        let items = pdfa(html, 'div.grid a');
        let videos = [];
        items.forEach(item => {
            let title = pdfh(item, 'div.p-2 div.font-medium&&Text');
            let img = pdfh(item, 'img&&src');
            let desc = pdfh(item, 'div.p-2 div.text-xs&&Text');
            // 修正：使用 @href 提取当前 a 标签的链接
            let url = pdfh(item, '@href');
            if (title && url) {
                videos.push({
                    title: title.trim(),
                    img: img,
                    desc: desc ? desc.trim() : '',
                    url: urljoin2(this.host, url)
                });
            }
        });
        return videos;
    },

    // ----- 一级分类（与推荐相同）-----
    一级: async function () {
        // 直接复用推荐逻辑
        let html = await request(this.host);
        let items = pdfa(html, 'div.grid a');
        let videos = [];
        items.forEach(item => {
            let title = pdfh(item, 'div.p-2 div.font-medium&&Text');
            let img = pdfh(item, 'img&&src');
            let desc = pdfh(item, 'div.p-2 div.text-xs&&Text');
            let url = pdfh(item, '@href');
            if (title && url) {
                videos.push({
                    title: title.trim(),
                    img: img,
                    desc: desc ? desc.trim() : '',
                    url: urljoin2(this.host, url)
                });
            }
        });
        return videos;
    },

    // ----- 二级详情页：提取书籍信息及章节列表 -----
    二级: async function () {
        let html = await request(this.input);
        let vod = {};

        vod.vod_name = pdfh(html, 'h1.text-2xl&&Text');
        vod.vod_pic = pdfh(html, 'div.w-32 img&&src');

        // 作者
        let authorMatch = html.match(/作者：<span[^>]*>([^<]+)</);
        vod.vod_writer = authorMatch ? authorMatch[1].trim() : '';

        // 演播
        let actorMatch = html.match(/演播：<span[^>]*>([^<]+)</);
        vod.vod_actor = actorMatch ? actorMatch[1].trim() : '';

        // 简介
        let intro = pdfh(html, 'div.mt-3.bg-white p.text-gray-600&&Text');
        vod.vod_content = intro ? intro.trim() : '';

        // 章节列表
        let items = pdfa(html, 'div.grid a');
        let playList = [];
        items.forEach(item => {
            let name = pdfh(item, 'span.text-sm&&Text');
            // 修正：使用 @href
            let link = pdfh(item, '@href');
            if (name && link) {
                playList.push(name.trim() + '$' + urljoin2(this.host, link));
            }
        });

        vod.vod_play_from = '正文';
        vod.vod_play_url = playList.join('#');

        // 提取书籍ID（用于可能的需要）
        let idMatch = this.input.match(/book\/(\d+)\.html/);
        if (idMatch) vod.vod_id = idMatch[1];

        return vod;
    },

    // ----- 搜索：解析搜索结果页 -----
    搜索: async function () {
        let searchUrl = this.host + '/search.php?q=' + encodeURIComponent(this.input);
        let html = await request(searchUrl);
        let items = pdfa(html, 'div.divide-y a');
        let videos = [];
        items.forEach(item => {
            let title = pdfh(item, 'h3.text-base&&Text');
            let img = pdfh(item, 'img&&src');
            let desc = pdfh(item, 'p.text-xs.text-gray-400&&Text');
            let url = pdfh(item, '@href');
            if (title && url) {
                videos.push({
                    title: title.trim(),
                    img: img,
                    desc: desc ? desc.trim() : '',
                    url: urljoin2(this.host, url)
                });
            }
        });
        return videos;
    }
};
