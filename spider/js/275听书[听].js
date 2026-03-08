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
    sniffer: 1,
    play_parse: true,
    globalCookie: '',
    预处理: async function () {
        try {
            let res = await request(this.host, { headers: this.headers, withCookie: true });
            // 内置request会自动保存cookie，无需手动处理
        } catch (e) {}
        return this.host;
    },
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
    二级: async function () {
        let html = await request(this.input, { headers: this.headers, timeout: this.timeout });
        if (html.includes('275听书网提示您') || html.includes('请您支持正版')) {
            return {
                vod_id: '',
                vod_name: '访问被拦截',
                vod_pic: '',
                vod_content: '网站返回了支持正版提示，请稍后重试。',
                vod_play_from: '提示',
                vod_play_url: '暂无章节'
            };
        }
        let pic = pdfh(html, 'div.w-32 img&&src') || pdfh(html, 'div.book-cover img&&src');
        let desc = pdfh(html, '.line-clamp-3&&Text') || '暂无简介';
        let items = pdfa(html, 'a[id^="chapter-pos-"]');
        let playList = [];
        items.forEach(item => {
            let name = pdfh(item, 'span.text-sm&&Text') || pdfh(item, 'a&&Text');
            let link = pdfh(item, 'a&&href');
            if (name && link && link.includes('/play/')) {
                let fullLink = urljoin2(this.host, link);
                playList.push(name.trim() + '$' + fullLink);
            }
        });
        if (playList.length === 0) {
            items = pdfa(html, 'a[href*="/play/"]');
            items.forEach(item => {
                let name = pdfh(item, 'a&&Text');
                let link = pdfh(item, 'a&&href');
                if (name && link && !name.includes('上一页') && !name.includes('下一页')) {
                    let fullLink = urljoin2(this.host, link);
                    playList.push(name.trim() + '$' + fullLink);
                }
            });
        }
        let name = pdfh(html, 'h1.text-2xl&&Text');
        let author = html.match(/作者：<span[^>]*>([^<]+)</)?.[1] || '';
        return {
            vod_id: this.input.match(/book\/(\d+)/)?.[1] || '',
            vod_name: name,
            vod_pic: pic,
            vod_content: desc,
            vod_actor: author,
            vod_play_from: playList.length > 0 ? '正文' : '提示',
            vod_play_url: playList.length > 0 ? playList.join('#') : '暂无章节'
        };
    },
    lazy: async function () {
        let html = await request(this.input, { headers: this.headers, timeout: this.timeout });
        if (html.includes('275听书网提示您') || html.includes('请您支持正版')) {
            return { url: this.input, parse: 1 };
        }
        let audioUrl = null;
        let patterns = [
            /url:\s*['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)[^'"]*)['"]/i,
            /audioUrl\s*=\s*['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)[^'"]*)['"]/i,
            /<audio[^>]+src=['"]([^'"]+\.(?:m4a|mp3|aac|wav|ogg)[^'"]*)['"]/i,
            /(https?:\/\/[^'"\s]+\.(?:m4a|mp3|aac|wav|ogg)(?:\?[^'"\s]*)?)/i
        ];
        for (let pattern of patterns) {
            let match = html.match(pattern);
            if (match) {
                audioUrl = match[1] || match[0];
                break;
            }
        }
        if (!audioUrl) {
            let scriptMatches = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
            for (let script of scriptMatches) {
                for (let pattern of patterns) {
                    let match = script.match(pattern);
                    if (match) {
                        audioUrl = match[1] || match[0];
                        break;
                    }
                }
                if (audioUrl) break;
            }
        }
        if (audioUrl) {
            if (audioUrl.startsWith('//')) audioUrl = 'https:' + audioUrl;
            else if (audioUrl.startsWith('/')) audioUrl = this.host + audioUrl;
            else if (!audioUrl.startsWith('http')) audioUrl = this.host + '/' + audioUrl;
            return {
                url: audioUrl,
                parse: 0,
                headers: { 'Referer': this.host, 'User-Agent': this.headers['User-Agent'] }
            };
        }
        return { url: this.input, parse: 1 };
    }
};
