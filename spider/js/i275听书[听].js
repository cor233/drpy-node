/*
@header({
  searchable: 1,
  filterable: 0,
  quickSearch: 0,
  title: 'i275听书网',
  '类型': '听书',
  lang: 'ds'
})
*/
var rule = {
    title: '275听书网',
    类型: '听书',
    host: 'https://m.i275.com',
    homeUrl: '/',
    url: '/',
    detailUrl: '/book/fyid.html',
    searchUrl: '/search.php?q=**&page=fypage',
    searchable: 1,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'MOBILE_UA',
        'Referer': 'https://m.i275.com/'
    },
    timeout: 5000,
    class_name: '',
    class_url: '',
    play_parse: true,
    lazy: function(html, input) {
        let audioUrl = '';
        
        // 从APlayer配置中提取音频URL
        let matches = html.match(/url: ['"]([^'"]+\.m4a[^'"]*)['"]/);
        if (matches) {
            audioUrl = matches[1];
        }
        
        // 查找audio标签
        if (!audioUrl) {
            let audioMatch = html.match(/<audio[^>]*src=['"]([^'"]+)['"]/);
            if (audioMatch) {
                audioUrl = audioMatch[1];
            }
        }
        
        // 查找xmcdn链接
        if (!audioUrl) {
            let xmcdnMatch = html.match(/https?:\/\/[^"'\s]+\.xmcdn\.com[^"'\s]+\.m4a[^"'\s]*/);
            if (xmcdnMatch) {
                audioUrl = xmcdnMatch[0];
            }
        }
        
        // 通用音频链接
        if (!audioUrl) {
            let audioMatch = html.match(/https?:\/\/[^"'\s]+\.(m4a|mp3|aac)[^"'\s]*/);
            if (audioMatch) {
                audioUrl = audioMatch[0];
            }
        }
        
        if (audioUrl) {
            if (!audioUrl.startsWith('http')) {
                audioUrl = 'https:' + audioUrl;
            }
            audioUrl = audioUrl.replace(/['"]/g, '');
            return audioUrl;
        }
        return '';
    },
    推荐: function(html) {
        let d = [];
        // 定位最近上架区域的grid容器
        let items = html.match(/<a[^>]*href="\/book\/\d+\.html"[^>]*>[\s\S]*?<\/a>/g);
        if (!items) items = [];
        
        // 去重处理
        let seen = new Set();
        items.forEach(item => {
            // 提取标题
            let titleMatch = item.match(/<div[^>]*class="[^"]*font-medium[^"]*"[^>]*>([^<]+)<\/div>/);
            let title = titleMatch ? titleMatch[1].trim() : '';
            
            // 提取图片
            let imgMatch = item.match(/<img[^>]*src="([^"]+)"[^>]*>/);
            let img = imgMatch ? imgMatch[1] : '';
            
            // 提取描述（演播）
            let descMatch = item.match(/<div[^>]*class="[^"]*text-xs[^"]*"[^>]*>([^<]+)<\/div>/);
            let desc = descMatch ? descMatch[1].trim() : '';
            
            // 提取链接
            let hrefMatch = item.match(/href="([^"]+)"/);
            let href = hrefMatch ? hrefMatch[1] : '';
            
            if (title && href && !seen.has(href)) {
                seen.add(href);
                if (!href.startsWith('http')) {
                    href = rule.host + href;
                }
                d.push({
                    title: title,
                    img: img,
                    desc: desc,
                    url: href
                });
            }
        });
        return d;
    },
    一级: function(html) {
        return rule.推荐(html);
    },
    二级: function(html) {
        // 书名
        let titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        let title = titleMatch ? titleMatch[1].trim() : '';
        
        // 封面图
        let imgMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*w-32[^"]*"[^>]*>/);
        if (!imgMatch) {
            imgMatch = html.match(/<img[^>]*src="([^"]+imagev2[^"]+)"[^>]*>/);
        }
        let img = imgMatch ? imgMatch[1] : '';
        
        // 作者
        let authorMatch = html.match(/<p[^>]*>作者：\s*<span[^>]*>([^<]+)<\/span>/);
        if (!authorMatch) {
            authorMatch = html.match(/<p[^>]*>作者[：:]\s*([^<]+)/);
        }
        let author = authorMatch ? authorMatch[1].trim() : '';
        
        // 演播
        let narratorMatch = html.match(/<p[^>]*>演播：\s*<span[^>]*>([^<]+)<\/span>/);
        if (!narratorMatch) {
            narratorMatch = html.match(/<p[^>]*>演播[：:]\s*([^<]+)/);
        }
        let narrator = narratorMatch ? narratorMatch[1].trim() : '';
        
        // 状态
        let statusMatch = html.match(/<p[^>]*>状态：\s*<span[^>]*>([^<]+)<\/span>/);
        let status = statusMatch ? statusMatch[1].trim() : '';
        
        // 简介
        let contentMatch = html.match(/<div[^>]*class="[^"]*bg-white[^"]*p-4[^"]*"[^>]*>[\s\S]*?<p[^>]*class="[^"]*text-gray-600[^"]*"[^>]*>([\s\S]*?)<\/p>/);
        let content = contentMatch ? contentMatch[1].trim() : '';
        
        // 组合描述 - 去掉特殊符号
        let desc = '';
        if (narrator) desc += '演播:' + narrator;
        if (author) {
            if (desc) desc += ' | ';
            desc += '作者:' + author;
        }
        if (status) {
            if (desc) desc += ' | ';
            desc += status;
        }
        
        let tabs = ['正文目录'];
        let lists = [];
        
        // 获取章节列表
        let chapterMatches = html.matchAll(/<a[^>]*href="(\/play\/\d+\/\d+\.html)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*text-sm[^"]*"[^>]*>([^<]+)<\/span>/g);
        let chapters = Array.from(chapterMatches);
        
        if (chapters.length === 0) {
            // 备用匹配
            let chapterRegex = /<a[^>]*href="(\/play\/\d+\/\d+\.html)"[^>]*>[\s\S]*?(\d+\.\s*[^<]+)<\/a>/g;
            chapters = Array.from(html.matchAll(chapterRegex));
        }
        
        let seenUrls = new Set();
        chapters.forEach(match => {
            let href = match[1];
            let chapterTitle = match[2].trim();
            
            if (href && chapterTitle && !seenUrls.has(href)) {
                seenUrls.add(href);
                if (!href.startsWith('http')) {
                    href = rule.host + href;
                }
                lists.push({
                    title: chapterTitle,
                    url: href
                });
            }
        });
        
        return {
            title: title,
            img: img,
            desc: desc,
            content: content,
            tabs: tabs,
            lists: lists
        };
    },
    搜索: function(html) {
        let d = [];
        // 匹配搜索结果项
        let items = html.matchAll(/<a[^>]*href="(\/book\/\d+\.html)"[^>]*class="flex[^"]*p-4[^"]*"[^>]*>([\s\S]*?)<\/a>/g);
        
        let seen = new Set();
        for (let item of items) {
            let href = item[1];
            let content = item[2];
            
            // 标题
            let titleMatch = content.match(/<h3[^>]*>([^<]+)<\/h3>/);
            let title = titleMatch ? titleMatch[1].trim() : '';
            
            // 图片
            let imgMatch = content.match(/<img[^>]*src="([^"]+)"[^>]*>/);
            let img = imgMatch ? imgMatch[1] : '';
            
            // 演播
            let narratorMatch = content.match(/<p[^>]*>演播[^<]*<\/span>\s*([^<]+)/);
            let narrator = narratorMatch ? narratorMatch[1].trim() : '';
            
            // 作者
            let authorMatch = content.match(/<p[^>]*>作者[^<]*<\/span>\s*([^<]+)/);
            let author = authorMatch ? authorMatch[1].trim() : '';
            
            // 简介
            let descMatch = content.match(/<p[^>]*class="[^"]*text-gray-400[^"]*"[^>]*>([^<]+)<\/p>/);
            let descText = descMatch ? descMatch[1].trim() : '';
            
            let desc = '';
            if (narrator) desc += '演播:' + narrator;
            if (author) {
                if (desc) desc += ' | ';
                desc += '作者:' + author;
            }
            
            if (title && href && !seen.has(href)) {
                seen.add(href);
                if (!href.startsWith('http')) {
                    href = rule.host + href;
                }
                d.push({
                    title: title,
                    img: img,
                    desc: desc,
                    content: descText,
                    url: href
                });
            }
        }
        
        return d;
    },
    sniffer: 1,
    isVideo: 'https?://[^"\\s]+\\.(m4a|mp3|aac|m3u8)'
}
