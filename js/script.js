/**
 * 好物助手chrome扩展，
 * 用来抓取https://m.taobao.com中“有好货”模块下的商品列表
 *
 * @author victor li
 * @date 2016/07/06
 * @version 0.0.1
 */

'use strict';

$(function() {

    targetPage();

    if (isInTargetPage()) {
        var intervalId = setInterval(function() {
            loadMore();
            if (loadCompleted()) {
                //catchStart();
                sendLoadedMessage();
                clearInterval(intervalId);
            }
        }, 300);

        var nowCount = goodsCount;

        function catchStart() {
            var intervalId = setInterval(function() {
                var endTime = new Date().getTime();
                if (endTime - startTime >= 10000) {
                    catchGoods();
                    clearInterval(intervalId);
                }
            }, 500);

        };
    } else if (isInDetailPage()) {
        //parseGoodsDetail();
        oneByOne();
    }

    registerMessageListener();

});

/**
 * 注册对来自background.js的消息监听
 */
function registerMessageListener() {
    chrome.extension.onRequest.addListener(function(request, sender) {
        if (request && request.list) {
            var l = request.list;
            l && saveData(l);
            var urls = collectDetailUrls(l);
            saveDetailUrls(urls);
            oneByOne();
        }
    });
};

/**
 * 向background.js发送页面已加载到底部的通知
 */
function sendLoadedMessage() {
    chrome.extension.sendRequest({loaded: true});
};

/**
 * 从background.js接收到的数据列表中收集详情页url
 */
function collectDetailUrls(list) {
    var urls = [];
    for (var i = 0, len = list.length; i < len; i++) {
        if (!list[i]) continue;
        var url = list[i].url;
        if (url.indexOf('lanlan/content.html') > -1)
            continue;
        if (url.indexOf('//') === 0) {
            url = url.replace('//', 'https://');
        }
        urls.push(url);
    }
    return urls;
};

/**
 * 定位到“有好货”页面
 */
function targetPage() {

    var currentHost = location.host,
        $haoHuo = $('#a10731-3'),
        targetSource = $haoHuo.data('href');

    if (currentHost === 'm.taobao.com')
        window.location.href = targetSource;

};

/**
 * 定位到“好货”详情页，
 * 并更新详情页url列表
 */
function targetDetailPage(detailUrl) {

    saveGoodsIndex(findIdFromDetailUrl(detailUrl));

    var detailUrls = JSON.parse(getDetailUrls());
    var index = detailUrls.indexOf(detailUrl);
    if (index > -1) {
        detailUrls.splice(index, 1);
    }

    saveDetailUrls(detailUrls);

    var timerId = setTimeout(function() {
        clearTimeout(timerId);
        window.location.href = detailUrl;
    }, 0);

};

function findIdFromDetailUrl(detailUrl) {

    // h5.m.taobao.com/guide/detail.html?id=1_125475179801&spm=a2141.7631544.t0.125475179801&scm=1007.11419.39180.0
    var temp1 = detailUrl.split('?');
    var params = temp1[1];
    var temp2 = params.split('&');
    var idParam = temp2[0];
    var temp3 = idParam.split('=');
    var id = temp3[1];

    return id.replace('1_', '');

};

/**
 * 判断是否是“好货”列表页面，
 */
function isInTargetPage() {

    var host = window.location.host,
        pathName = window.location.pathname;

    if (host === 'h5.m.taobao.com'
            && pathName === '/lanlan/index.html')
        return true;

    return false;

};

/**
 * 判断是否在“好货”详情页
 */
function isInDetailPage() {

    var host = window.location.host,
        pathName = window.location.pathname;

    if (host === 'h5.m.taobao.com'
            && pathName === '/guide/detail.html') {
        return true;
    }

    return false;

};

/**
 * 判断“好货“加载是否完成
 * TODO
 */
function loadCompleted() {
    if ($('#tloading').text().indexOf('加载中') > -1)
        return false;
    return true;
};

var goodsList = [];

// 已加载到的“好货”数量
var goodsCount = 0;

// 抓取起始时间
var startTime = new Date().getTime();

function oneByOne() {
    var detailUrls = getDetailUrls();
    if (detailUrls)
        detailUrls = JSON.parse(detailUrls);
    else
        return;

    if (detailUrls.length === 0) {
        doCatchCompleted();
        return;
    }

    var detailUrl = detailUrls[0];
    targetDetailPage(detailUrl);
};

/**
 * 解析“好货”DOM结构
 */
function parseGoods($goods) {

    for (var i = 0, len = $goods.length; i < len; i++) {
        var $item = $($goods[i]).find('.item-wrapper');
        var $img = $item.find('.item-img-wrapper'),
            $description = $item.find('.item-description'),
            $recommend = $item.find('.item-tag-recommend-wrapper');

        var goodsData = {
            img: $img.find('img').attr('src'),
            title: $description.find('.item-title').text(),
            summary: $description.find('.item-summary').text(),
            likeNum: $recommend.find('.item-like-total').text()
        };

        goodsList.push(goodsData);
        goodsCount++;

    };
    saveData(goodsList);

};

function parseGoodsDetail() {

    var $container = $('#box-wrapper');
    var $img = $container.find('#header-wrapper>img');
    var $title = $container.find('#detail-title');
    var $price = $container.find('.price-wrapper');
    var $authorAndRecommend = $container.find('#author-wrapper');

    var detailData = {
        //img: $img.attr('src'),
        //title: $title.text(),
        originalPrice: $price.find('.original-price').text(),
        price: $price.find('.reserve-price').text(),
        authorNick: $authorAndRecommend.find('#author-name').text(),
        content: $authorAndRecommend.find('span:last').text()
    };

    var currentGoodsId = getCurrentGoodsIndex();
    var goods = findGoodsById(currentGoodsId);

    $.extend(goods, detailData);

    var goodsList = updateGoodsList(goods);
    saveData(goodsList);
    oneByOne();

};

function checkGoodsLoaded($goods) {
    if ($goods.length > goodsCount)
        return true;
    return false;
};

/**
 * 抓取商品列表信息
 */
function catchGoods() {

    var $goods = $('#content>ul>li');

    var intervalId = setInterval(function() {
        if (checkGoodsLoaded($goods)) {
            clearInterval(intervalId);
            parseGoods($goods);
        }
    }, 300);

};

/**
 * 加载更多“好货”
 */
function loadMore() {

    var body = document.querySelector('body');
    body.scrollTop = body.scrollHeight;

};

/**
 * 根据id查找对应“好货”
 */
function findGoodsById(id) {
    var goodsList = localStorage.getItem('haowu_goods');
    if (goodsList)
        goodsList = JSON.parse(goodsList);
    for (var i = 0, len = goodsList.length; i < len; i++) {
        if (goodsList[i].contentId == id)
            return goodsList[i];
    }

    return null;
};

/**
 * 更新“好货”列表
 */
function updateGoodsList(goods) {
    var goodsList = localStorage.getItem('haowu_goods');
    if (goodsList)
        goodsList = JSON.parse(goodsList);
    for (var i = 0, len = goodsList.length; i < len; i++) {
        if (goodsList[i].contentId === goods.contentId)
            goodsList[i] = goods;
    }

    return goodsList;
};

/**
 * 存储“好货”数据列表
 */
function saveData(data) {
    if (data)
        localStorage.setItem('haowu_goods', JSON.stringify(data));
};

/**
 * 存储“好货”详情页url列表
 */
function saveDetailUrls(data) {
    if (data)
        localStorage.setItem('haowu_detail_urls', JSON.stringify(data));
};

/**
 * 获取“好货”详情页url列表
 */
function getDetailUrls() {
    return localStorage.getItem('haowu_detail_urls');
};

/**
 * 存储当前“好货”id
 */
function saveGoodsIndex(id) {
    localStorage.setItem('haowu_current_goods', id);
};

/**
 * 获取当前“好货”id
 */
function getCurrentGoodsIndex() {
    return localStorage.getItem('haowu_current_goods');
};

/**
 * 发送爬取完成信息
 */
function doCatchCompleted() {
    console.log('catch completed');
    chrome.extension.sendRequest({catchCompleted: true});
};

