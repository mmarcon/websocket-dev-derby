/*
 * Copyright (C) 2012 Massimiliano Marcon

 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:

 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

$(function(){
    //Create a global namespace.
    //While this is not strictly necessary as everything could
    //leave in the closure body assigning objects to this namespace
    //is useful for debugging purpose.
    window.DEMO = {};

    var DEMO = window.DEMO, defaultTags = ['people', 'monkey', 'banana', 'robot'],
    fetchPhotos, addPhotos, errorHandler, photoTemplate, gallery = $('.photos'), memberTemplate, memberCounter = 1, messageTemplate,
    initMagellan, groupForm, initForm, introForm, app, audio = $('audio')[0];

    DEMO.M = Magellan();
    DEMO.firstTime = true;
    
    /*Just a simple template to wrap the photos from Flickr*/
    photoTemplate = '<li class="photo-item"><div class="photo" style="background-image:url({SRC})"><a class="attribution" href="{ORIGINAL}" target="_blank"></a></div>'+
                    '<div class="title" contenteditable="true">{TITLE}</div><span class="close"></span></li>';
    memberTemplate = '<li class="{MEMBER_ID}"><img src="http://flickholdr.com/32/32/person/{COUNTER}" alt="{MEMBER_NAME}" /><h4>{MEMBER_NAME}</h4></li>';
    messageTemplate = '<h3>{TITLE}</h3><p>{TEXT}</p>';

    DEMO.M.registerEventHandler(Magellan.Event.leave, function(d){
        $('.members').children('.' + d.node).remove();
    });

    DEMO.M.registerEventHandler(Magellan.Event.transfer, function(d){
        var li = $(photoTemplate.replace(/\{SRC\}/, d.payload.src)
                                .replace(/\{TITLE\}/, d.payload.title || 'No title')
                                .replace(/\{ORIGINAL\}/, d.payload.link));
        audio.load();
        audio.play();
        li.data('photo', d.payload);
        li.draggable({
            scope: 'transfer',
            helper: 'clone',
            appendTo: 'body',
            scroll: false,
            zIndex: 500,
            start: function(event, ui){
                $('.photos li.photo-item').fadeTo(500, 0.2);
                $('.group').addClass('dragging');
                ui.helper.addClass('dragging');
            },
            stop: function(event, ui){
                $('.photos li.photo-item').fadeTo(300, 1);
                $('.group').removeClass('dragging');
            },
            cancel: '.title' //So the editable part is easily clickable
        });
        li.children('.title').on('DOMCharacterDataModified', function(){
                li.data('photo', {src: d.payload.src, title: $(this).text()});});
        gallery.prepend(li.addClass('shared'));
    });

    DEMO.M.registerEventHandler(Magellan.Event.join, function(d){
        var li = $(memberTemplate.replace(/\{COUNTER\}/, memberCounter++).replace(/\{MEMBER_NAME\}/g, d.display).replace(/\{MEMBER_ID\}/, d.node));
        li.data('magellannode', d.node);
        li.droppable({
            drop: function(event, ui){
                    var photo = ui.draggable.data('photo');
                    DEMO.M.transfer($(this).data('magellannode'), photo);
                },
                hoverClass: 'hovering',
                scope: 'transfer',
                tolerance: 'pointer'
        });
        $('.members').append(li);
    });

    DEMO.M.registerEventHandler(Magellan.Event.groupassigned, function(d){
        $('.group h3').text(d.group);
        $('.group .members').show();
        $('.start-over').show();
    });

    $(window).unload(function(){
        if (DEMO.M) {DEMO.M.leave();}
    });

    initMagellan = function(groupname, displayname) {
        DEMO.M.join(null, groupname, displayname);
    };

    /*Add photos to the DOM and make them draggable, thanks jQuery UI.*/
    addPhotos = function(photos){
        photos.forEach(function(photo){
            var li = $(photoTemplate.replace(/\{SRC\}/, photo.media.m)
                                    .replace(/\{TITLE\}/, photo.title || 'No title')
                                    .replace(/\{ORIGINAL\}/, photo.link));
            li.data('photo', {src: photo.media.m, title: photo.title, link: photo.link});
            li.draggable({
                scope: 'transfer',
                helper: 'clone',
                appendTo: 'body',
                scroll: false,
                zIndex: 500,
                start: function(event, ui){
                    $('.photos li.photo-item').fadeTo(500, 0.2);
                    $('.group').addClass('dragging');
                    ui.helper.addClass('dragging');
                },
                stop: function(event, ui){
                    $('.photos li.photo-item').fadeTo(300, 1);
                    $('.group').removeClass('dragging');
                },
                cancel: '.title' //So the editable part is easily clickable
            });
            li.children('.title').on('DOMCharacterDataModified', function(){
                li.data('photo', {src: photo.media.m, title: $(this).text()});});
            gallery.append(li);
        });
    };

    errorHandler = function(error){
        var errorMessage = $(messageTemplate.replace(/\{TITLE\}/, 'Error').replace(/\{TEXT\}/, 'Oooops! An error occured. <br/> Reload the page and try again.'));
        $('.message').append(errorMessage);
    };

    /*Get photos via Flickr API with the assigned tags*/
    fetchPhotos = function(tags, callback){
        $.ajax({
            url: 'http://api.flickr.com/services/feeds/photos_public.gne?format=json&tagmode=any&tags='+tags.join(),
            success: function(response){
                if (response.items && response.items.length > 0) {
                    addPhotos(response.items);
                    if ($.isFunction(callback)) {
                        callback();
                    }
                }
                else {
                    errorHandler('Couldn\'t find any photo');
                }
            },
            error: errorHandler,
            dataType: 'jsonp',
            jsonpCallback: 'jsonFlickrFeed'
        });
    };

    groupForm = function(showHide){
        if (showHide === 'show') {
            initForm('hide');
            app('hide');
            introForm('hide');
            $('body').css('overflow', 'hidden');
            $('.tutorial').show();
            $('.group-form').show();
            $('.step-group').show();
        }
        else {
            $('body').css('overflow', 'auto');
            $('.tutorial').hide();
            $('.group-form').hide();
            $('.step-group').hide();
        }
    };

    initForm = function(showHide){
        if (showHide === 'show') {
            groupForm('hide');
            app('hide');
            introForm('hide');
            $('body').css('overflow', 'hidden');
            $('.tutorial').show();
            $('.init-form').show();
            $('.step-init').show();
        }
        else {
            $('body').css('overflow', 'auto');
            $('.tutorial').hide();
            $('.init-form').hide();
            $('.step-init').hide();
        }
    };

    introForm = function(showHide){
        if (showHide === 'show') {
            groupForm('hide');
            initForm('hide');
            app('hide');
            $('body').css('overflow', 'hidden');
            $('.tutorial').show();
            $('.video-intro').show();
            $('.step-video').show();
        }
        else {
            $('body').css('overflow', 'auto');
            $('.tutorial').hide();
            $('.video-intro').hide();
            $('.step-video').hide();
        }
    };

    app = function(showHide){
        if (showHide === 'show') {
            groupForm('hide');
            initForm('hide');
            introForm('hide');
            $('body').css('overflow', 'hidden');
            $('.tutorial').show();
            $('.step-app').show();
        }
        else {
            $('body').css('overflow', 'auto');
            $('.tutorial').hide();
            $('.step-app').hide();
        }
    };

    $('.init-form a').on('click', function(){
        var userTags = $('#tags').val();
        $('.init-form').fadeTo(500, 0, function(){$(this).hide();initForm('hide');});
        $('.photos li.photo-item').fadeTo(500, 1);
        if ($(this).hasClass('fetch')) {
            fetchPhotos(userTags.length > 0 ? userTags.replace(/\s/g, '').split(',') : defaultTags, function(){
                if (DEMO.firstTime) {
                    DEMO.firstTime = false;
                    app('show');
                    setTimeout(function(){
                        app('hide');
                    }, 5000);
                }
            });
        }
        else if ($(this).hasClass('empty')) {
            gallery.empty();
        }
        return false;
    });

    $(document).on('click', 'li.photo-item .close', function(){
        $(this).parent().fadeTo(500, 0, function(){$(this).remove();});
    });
    //Make broadcast li element droppable
    $('.broadcast').droppable({
        drop: function(event, ui){
            var photo = ui.draggable.data('photo');
            DEMO.M.transfer($(this).data('magellannode'), photo);
        },
        hoverClass: 'hovering',
        scope: 'transfer',
        tolerance: 'pointer'
    });
    $('.init-form').on('keypress', function(e){
        if (e.keyCode == 13) {
            $('a.fetch').trigger('click');
            return false;
        }
        return true;
    });
    $('a.group-button').on('click', function(){
        var groupName = Magellan.AssignGroup, displayName = null;
        if ($('#nodename').val().length > 0) {
            displayName = $('#nodename').val();
        }
        if ($(this).hasClass('makegroup')) {
            if ($('#groupname').val().length > 0) {
                groupName = $('#groupname').val();
            }
            else {
                return false;
            }
        }
        initMagellan(groupName, displayName);
        $('.group-form').fadeTo(500, 0, function(){$(this).hide(); $('.init-form').fadeTo(300, 1, function(){$(this).show();});initForm('show');});
        return false;
    });
    $('.group-form').on('keypress', function(e){
        if (e.keyCode == 13) {
            $('a.makegroup').trigger('click');
            return false;
        }
        return true;
    });
    $('.start-over').on('click', function(){
        $(document).scrollTop(0);
        if ($('.photos li.photo-item').length === 0) {
            $('.init-form').fadeTo(300, 1, function(){initForm('show');});
        }
        else {
            $('.photos li.photo-item').fadeTo(500, 0.2, function(){$('.init-form').fadeTo(300, 1, function(){initForm('show');});});
        }
        return false;
    });

    $('.go').on('click', function(){
        introForm('hide');
        groupForm('show');
        return false;
    });

    introForm('show');
});