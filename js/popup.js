/**
 * Popup page script.
 *
 * @author victor li
 * @date 2016/07/08
 * @version 0.0.1
 */

'use strict';

$(function() {

    $('body').on('click', '#open-m-taobao', handler);

});

function handler() {

    window.open('https://m.taobao.com');

};

