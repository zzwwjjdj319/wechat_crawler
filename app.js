var ut = require('./common.js');
var async = require('async');
console.log('开始测试!!!')
var public_num = '支付宝';
//任务数组
var task = [];
//根据public_num搜索公众号,最好是微信号或者微信全名.
task.push(function (callback) {
  ut.search_wechat(public_num, callback)
});
//根据url获取公众号获取最后10条图文列表
task.push(function (url, callback) {
  ut.look_wechat_by_url(url, callback)
})
//根据图文url获取详细信息,发布日期,作者,公众号,阅读量,点赞量等
task.push(function (article_titles, article_urls, article_pub_times, callback) {
  ut.get_info_by_url(article_titles, article_urls, article_pub_times, callback)
})
//执行任务
async.waterfall(task, function (err, result) {
  if (err) return console.log(err);
  console.log(result);
})