var request = require('request');
var async = require('async');
var cheerio = require('cheerio');
var Ut = {};

/**
根据微信号搜索公众号,并获取搜素到的第一个公众号链接
@param {string} public_num 微信号
@param {function} callback 回调函数,callback(null,url)
*/
Ut.search_wechat = function (public_num, callback) {
  var encode_public_num = encodeURIComponent(public_num);
  var url = `http://weixin.sogou.com/weixin?type=1&query=${encode_public_num}&ie=utf8&_sug_=y&_sug_type_=1`;
  request(url, function (err, response, html) {
    if (err) return callback(err, null);
    if (html.indexOf('<title>302 Found</title>') != -1) return callback(null, '302');
    if (html.indexOf('您的访问过于频繁') != -1) return callback('-访问过于频繁')
    var $ = cheerio.load(html);
    //公众号页面的临时url
    var wechat_num = $($("#sogou_vr_11002301_box_0 a")[0]).attr('href') || '';
    setTimeout(function () {
      callback(null, wechat_num.replace(/amp;/g, ''));
    }, 1000 + Math.ceil(Math.random() * 500));
  })
};

/**
获取最近10条图文信息列表
@param {string} url 根据search_wechat方法得到的公众号链接
@param {function} callback 回调函数,callback(null, article_titles, article_urls, article_pub_times)
*/
Ut.look_wechat_by_url = function (url, callback) {
  var task3 = [];
  //发布时间数组
  var article_pub_times = [];
  //标题列表数组
  var article_titles = [];
  //文章临时url列表数组
  var article_urls = [];
  request(url, function (err, response, html) {
    if (err) return callback(err, null, null);
    var task4 = [];
    if (html.indexOf('为了保护你的网络安全，请输入验证码') != -1) {
      //验证验证码
      task4.push(function (callback) {
        Ut.solve_verifycode(html, url, function (err, result) {
          if (err) return callback(err, null);
          callback(null, result);
        })
      });
    } else {
      task4.push(function (callback) {
        callback(null, html);
      });
    }
    task4.push(function (html, callback) {
      //文章数组,页面上是没有的,在js中,通过正则截取出来
      var msglist = html.match(/var msgList = ({.+}}]});?/);
      if (!msglist) return callback(`-没有搜索到 ${publicNum} 的文章,只支持订阅号,服务号不支持!`);
      msglist = msglist[1];
      msglist = msglist.replace(/(&quot;)/g, '\\\"').replace(/(&nbsp;)/g, '');
      msglist = JSON.parse(msglist);
      if (msglist.list.length == 0) return callback(`-没有搜索到 ${publicNum} 的文章,只支持订阅号,服务号不支持!`);

      //循环文章数组,重组数据
      msglist.list.forEach(function (msg, index) {
        //基本信息,主要是发布时间
        var article_info = msg.comm_msg_info;
        //发布时间
        var article_pub_time = Ut.fmtDate(new Date(article_info.datetime * 1000)).split(" ")[0];
        //第一篇文章
        var article_first = msg.app_msg_ext_info;
        article_pub_times.push(article_pub_time);
        article_titles.push(article_first.title);
        article_urls.push('http://mp.weixin.qq.com' + article_first.content_url.replace(/(amp;)|(\\)/g, ''));
        if (article_first.multi_app_msg_item_list.length > 0) {
          //其他文章
          var article_others = article_first.multi_app_msg_item_list;
          article_others.forEach(function (article_other, index) {
            article_pub_times.push(article_pub_time);
            article_titles.push(article_other.title);
            article_urls.push('http://mp.weixin.qq.com' + article_other.content_url.replace(/(amp;)|(\\)/g, ''));
          })
        }
      })
      callback(null);
    })
    async.waterfall(task4, function (err, result) {
      if (err) return callback(err);
      setTimeout(function () {
        callback(null, article_titles, article_urls, article_pub_times);
      }, 1000 + Math.ceil(Math.random() * 500));
    })
  })
};

/**
根据图文url获取详细信息,发布日期,作者,公众号,阅读量,点赞量等
@param {array} article_titles 所有标题数组
@param {array} article_urls 所有文章临时url数组
@param {array} article_pub_times 所有发布时间数组
@param {function} callback 回调函数,callback(null, articles);
*/
Ut.get_info_by_url = function (article_titles, article_urls, article_pub_times, callback) {
  var task1 = [];
  var articles = [];
  if (article_urls.length > 0) {
    article_urls.forEach(function (article_url, index) {
      //此if可以限制获取文章的数量.为了测试,限制抓取5篇
      if (index < 5) {
        task1.push(function (callback) {
          var article_object = {
            title: '', url: '', read_num: '', like_num: '',
            release_time: '', author: '', wechat_number: ''
          }
          var task2 = [];
          //发布日期,作者,公众号,url
          task2.push(function (callback) {
            request(article_url, function (err, response, html) {
              if (err) return callback(err, null);
              var $ = cheerio.load(html);
              //发布日期
              var release_time = $("#post-date").text();
              //作者
              var author = $($(".rich_media_meta_list em")[1]).text();
              //公众号
              var wechat_number = $("#post-user").text();
              article_object.release_time = release_time;
              article_object.author = author;
              article_object.wechat_number = wechat_number;
              article_object.title = article_titles[index].replace(/amp;/g, '').replace(/&quot;/g, '"');
              article_object.url = article_urls[index];
              callback(null, article_url);
            })
          })
          //阅读量和点赞量,ajax获取
          task2.push(function (article_url, callback) {
            var ajax_url = article_url.replace(/\/s\?/, '/mp/getcomment?');
            var options = {
              url: ajax_url,
              json: true,
              method: 'GET'
            };
            Ut.request_json(options, function (err, data) {
              if (err) {
                console.log(err)
                article_object.read_num = 0;
                article_object.like_num = 0;
                return callback(null, article_url);
              }
              article_object.read_num = data.read_num;
              article_object.like_num = data.like_num;
              callback(null, article_url);
            })
          })
          task2.push(function (article_url, callback) {
            var suffix_url = `&devicetype=Windows-QQBrowser&version=61030004&pass_ticket=qMx7ntinAtmqhVn+C23mCuwc9ZRyUp20kIusGgbFLi0=&uin=MTc1MDA1NjU1&ascene=1`;
            var get_forever_url = article_url + suffix_url;
            var options = {
              url: get_forever_url,
              headers: {
                'User-Agent': 'request'
              }
            };
            request(options, function (error, response, body) {
              if (!error && response.statusCode == 200) {
                article_object.url = response.request.href;
              }
              callback(null);
            });
          })
          async.waterfall(task2, function (err, result) {
            if (err) return callback(err, null);
            articles.push(article_object);
            setTimeout(function () {
              callback(null);
            }, 500 + Math.ceil(Math.random() * 500));
          })

        })
      }
    })
  }
  async.waterfall(task1, function (err, result) {
    if (err) return callback(err, null);
    callback(null, articles);
  })
};

/**
通过第三方接口,解决搜狗微信验证码
@param {string} html ,从html获取验证码等信息
@param {string} url  ,验证成功后重新访问的url即公众号链接
*/
Ut.solve_verifycode = function (html, url, callback) {
  console.log('识别验证码');
  var code_cookie = '';
  var cert = '';
  var task_code = [];
  //获取base64格式的验证码图片
  task_code.push(function (callback) {
    var $ = cheerio.load(html);
    var img_url = 'http://mp.weixin.qq.com' + $("#verify_img").attr('src');
    img_url = `http://mp.weixin.qq.com/mp/verifycode?cert=${(new Date).getTime() + Math.random()}`
    cert = img_url.split('=')[1];
    var j = request.jar();
    request.get({ url: img_url, encoding: 'base64', jar: j }, function (err, response, body) {
      if (err) return callback(err);
      var cookie_string = j.getCookieString(img_url);
      code_cookie = cookie_string;
      callback(null, body);
    })
  })
  //通过第三方接口识别验证码,并返回
  task_code.push(function (base64, callback) {
    var form = {
      img_base64: base64,
      typeId: 2040
    }
    var opts = {
      url: 'http://ali-checkcode.showapi.com/checkcode',
      method: 'POST',
      formData: form,
      json: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        //授权码
        "Authorization": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    };
    Ut.request_json(opts, function (err, data) {
      if (err) return callback(err);
      if (data.showapi_res_code == 0) {
        callback(null, data.showapi_res_body.Result);
      }
    })
  });
  //验证验证码是否正确
  task_code.push(function (verifycode, callback) {
    var verifycode_url = `http://mp.weixin.qq.com/mp/verifycode?cert=${encodeURIComponent(cert)}&input=${encodeURIComponent(verifycode)}`;
    var form = {
      input: encodeURIComponent(verifycode),
      cert: encodeURIComponent(cert)
    }
    var options = {
      url: verifycode_url,
      json: true,
      formData: form,
      method: 'post',
      headers: { "Cookie": code_cookie }
    };
    Ut.request_json(options, function (err, data) {
      if (err) return callback(err);
      console.log('验证码识别成功')
      callback(null);
    })
  })
  //验证码正确重新访问
  task_code.push(function (callback) {
    request(url, function (err, response, html) {
      if (err) return callback(err, null);
      //搜狗微信的验证码即使输入成功,有的时候也需要输入几次验证码,所以重复调用solve_verifycode方法
      if (html.indexOf('为了保护你的网络安全，请输入验证码') != -1) {
        return Ut.solve_verifycode(html, url, callback);
      }
      callback(null, html);
    })
  })
  async.waterfall(task_code, function (err, result) {
    if (err) return callback(err, null);
    callback(null, result);
  })
};


/**
request的ajax获取方法,某些网站反爬,可以自定义头部
  var options = {
    url: url,
    json:true,
    method : 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 
       (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36',
      'X-Requested-With':'XMLHttpRequest'
    }
  };
*/
Ut.request_json = function (options, callback) {
  request(options, function (error, response, body) {
    if (error) return callback(error, null);
    if (response.statusCode != 200) return callback("statusCode" + response.statusCode, null);
    callback(null, body);
  });
};

/**
格式化时间
*/
Ut.fmtDate = function (date) {
  // 将数字格式化为两位长度的字符串
  var fmtTwo = function (number) {
    return (number < 10 ? '0' : '') + number;
  };
  var yyyy = date.getFullYear();
  var MM = fmtTwo(date.getMonth() + 1);
  var dd = fmtTwo(date.getDate());
  var HH = fmtTwo(date.getHours());
  var mm = fmtTwo(date.getMinutes());
  var ss = fmtTwo(date.getSeconds());
  return '' + yyyy + '-' + MM + '-' + dd + ' ' + HH + ':' + mm + ':' + ss;
}

module.exports = Ut;