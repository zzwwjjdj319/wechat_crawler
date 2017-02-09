# wechat_crawler
nodejs爬虫-通过抓取搜狗微信网站获取微信文章信息!

## [展示地址](http://117.40.138.188:15978/wxmatrix/app/page/article-top-list)

## 说明
### 使用的模块
* async -- 异步流程控制  [基本使用](http://blog.csdn.net/zzwwjjdj1/article/details/51857959)
* request -- 抓取网站模块 [官网](https://www.npmjs.com/package/request)
* cheerio -- 处理html模块 [官网](https://www.npmjs.com/package/cheerio)
* [我的博客](http://blog.csdn.net/zzwwjjdj1/)

### 代码说明
* app.js是主文件,`npm install` 后 `node app` 就可以启动爬虫任务,测试是支付宝公众号,爬取了最近5篇文章;
* common.js是封装好的各种方法.
* 爬取的思路 : 从搜索开始 -> 进入公众号文章列表页面 -> 再分别访问每篇文章 ->同时ajax获取点赞量,阅读量等信息. 因为公众号文章列表和文章内容页的url都是临时链接,大概是2个小时过期,所以每次都需要从搜索开始爬取.
* 注意`验证码`问题,nodejs识别验证码暂时没找到好用的模块,我使用的是第三方接口实现的.授权码已屏蔽.
* 整个爬取过程已完成.至于最后是写成接口还是自动运行,都可以自行修改.

## 有问题反馈
在使用中有任何问题，欢迎反馈给我.

## 感激
感谢以下的朋友,排名不分先后

* [mnixu](https://github.com/mnixu/) 
* [liaizhen](https://github.com/liaizhen/)
