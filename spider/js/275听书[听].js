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

    推荐: async function () {
        let html = await request(this.host);
        log('推荐页HTML长度：' + html.length); // 调试
        let items = pdfa(html, 'div.grid a');
        log('推荐条目数：' + items.length);
        let videos = [];
        items.forEach(item => {
            // 备选标题提取：先尝试原选择器，失败则取整个div内第一个文本块
            let title = pdfh(item, 'div.p-2 div.font-medium&&Text') || pdfh(item, 'div.p-2&&Text');
            let img = pdfh(item, 'img&&src');
            let desc = pdfh(item, 'div.p-2 div.text-xs&&Text');
            // 链接提取：优先 @href，若无效则尝试正则提取
            let url = pdfh(item, '@href') || item.match(/href="([^"]+)"/)?.[1];
            if (title && url) {
                videos.push({
                    title: title.trim(),
                    img: img,
                    desc: desc ? desc.trim() : '',
                    url: urljoin2(this.host, url)
                });
            } else {
                log('跳过无效条目：title=' + title + ', url=' + url);
            }
        });
        log('最终推荐视频数：' + videos.length);
        return videos;
    },

    一级: async function () {
        // 复用推荐逻辑
        return await this.推荐();
    },

    二级: async function () {
        let html = await request(this.input);
        let vod = {};

        vod.vod_name = pdfh(html, 'h1.text-2xl&&Text');
        vod.vod_pic = pdfh(html, 'div.w-32 img&&src');

        let authorMatch = html.match(/作者：<span[^>]*>([^<]+)</);
        vod.vod_writer = authorMatch ? authorMatch[1].trim() : '';

        let actorMatch = html.match(/演播：<span[^>]*>([^<]+)</);
        vod.vod_actor = actorMatch ? actorMatch[1].trim() : '';

        let intro = pdfh(html, 'div.mt-3.bg-white p.text-gray-600&&Text');
        vod.vod_content = intro ? intro.trim() : '';

        let items = pdfa(html, 'div.grid a');
        let playList = [];
        items.forEach(item => {
            let name = pdfh(item, 'span.text-sm&&Text');
            let link = pdfh(item, '@href') || item.match(/href="([^"]+)"/)?.[1];
            if (name && link) {
                playList.push(name.trim() + '$' + urljoin2(this.host, link));
            }
        });

        vod.vod_play_from = '正文';
        vod.vod_play_url = playList.join('#');

        let idMatch = this.input.match(/book\/(\d+)\.html/);
        if (idMatch) vod.vod_id = idMatch[1];

        return vod;
    },

    搜索: async function () {
        let searchUrl = this.host + '/search.php?q=' + encodeURIComponent(this.input);
        let html = await request(searchUrl);
        let items = pdfa(html, 'div.divide-y a');
        let videos = [];
        items.forEach(item => {
            let title = pdfh(item, 'h3.text-base&&Text');
            let img = pdfh(item, 'img&&src');
            let desc = pdfh(item, 'p.text-xs.text-gray-400&&Text');
            let url = pdfh(item, '@href') || item.match(/href="([^"]+)"/)?.[1];
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
