/**
 * 1. 对前端页面的接口请求进行监听，拿到接口地址
 * 2. 过滤下需要的接口地址，依次调用这些接口并保存返回数据
 * 3. 调用完成后将数据发送回前端脚本处理
 *
 * @author linianchao
 * @date 2016/07/09
 * @version 0.0.1
 */

// “好货”接口数组
var urls = [];

var detailUrls = [];

// 获取到的“好货”数组
var result = [];

var detailResult = [];

var tabId;

var goodsTask = 0;

var goodsDetailTask = 0;

chrome.webRequest.onCompleted.addListener(
    function(detail) {
        var url = detail.url;
        url = url.replace(/jsonp/g, 'json');
        if (url.indexOf('recommend.list') > -1 && urls.indexOf(url) === -1)
            urls.push(url);
        if (url.indexOf('mini.detail') > -1 && detailUrls.indexOf(url) === -1)
            detailUrls.push(url);
    },
    {
        urls: ['*://api.m.taobao.com/*']
    }
);

function getGoods(url) {
    $.get(url, function(res) {
        result = result.concat(res.data.resultList);
        goodsTask++;
        if (goodsTask >= urls.length) {
            sendDataToFrontend();
        }
    });
};

function getGoodsDetail(url) {
    $.get(url, function(res) {
        detailResult = detailResult.concat(res.data);
        console.log('======');
        goodsDetailTask++;
        if (goodsDetailTask >= detailUrls.length) {
            mergeResult();
        }
    });
};

/**
 * 对获得的“好货”接口进行调用
 */
function startCatch() {

    for (var i = 0, len = urls.length; i < len; i++) {
        doCatch(i);
    }

    function doCatch(index) {
        setTimeout(function() {
            getGoods(urls[index]);
        }, Math.floor(Math.random() * 1000));
    }

};

function startCatchDetail() {

    for (var i = 0, len = detailUrls.length; i < len; i++) {
        doCatch(i);
    }

    function doCatch(index) {
        setTimeout(function() {
            getGoodsDetail(detailUrls[index]);
        }, Math.floor(Math.random() * 1000));
    }

};

/**
 * 将接口得到的“好货”列表发给前端
 */
function sendDataToFrontend() {
    chrome.tabs.sendRequest(tabId, {list: result});
};

function mergeResult() {
    var endResult = [];
    for (var i = 0, len1 = result.length; i < len1; i++) {
        for (var j = 0, len2 = detailResult.length; j < len2; j++) {
            if (result[i] && detailResult[j] && result[i].contentId == detailResult[j].contentId) {
                var obj = $.extend(result[i], detailResult[j]);
                endResult.push(obj);
            }
        }
    }

    console.log(endResult);

    startPush(endResult);
};

function handleData(data) {
    if (data) {

        delete data.ext;
        delete data.extList;

        data.pic = encodeURIComponent(data.pic);
        data.pics = encodeURIComponent(data.pics);
        data.srcUrl = encodeURIComponent(data.srcUrl);
        data.url = encodeURIComponent(data.url);
        data.yhhAuthorUrl = encodeURIComponent(data.yhhAuthorUrl);
        data.h5Url = encodeURIComponent(data.h5Url);

        return data
    }
};

function startPush(data) {
    if (data.length === 0)
        return;

    for (var i = 0, len = data.length; i < len; i++) {
        pipe(i);
    }

    function pipe(i) {
        setTimeout(function() {
            submitData(handleData(data[i]));
            //data.splice(0, 1);
        }, Math.floor(Math.random() * 1000) + 2000 * i);
    }

    function submitData(d) {
        $.ajax({
            url:'http://115.29.190.227:8130/yhh/api/arctic/details',
            type: 'POST',
            data: 'params=' + JSON.stringify(d),
            success: function(res) {
                console.log(res);
            },
            error: function(err) {
                console.log(err);
            }
        });
    };
};

/**
 * 接收前端页面消息，判断页面是否已经加载到底部
 */
chrome.extension.onRequest.addListener(function(request, sender) {
    tabId = sender.tab.id;
    console.log(request);
    if (request && request.loaded)
        startCatch();
    if (request && request.catchCompleted) {
        startCatchDetail();
    }
});

