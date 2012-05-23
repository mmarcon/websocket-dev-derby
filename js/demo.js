$(function(){

    /* @todo:
     * Choose group name or join a random one (node.js support for this)
     * Photo received UI + comment back
     * Add fake member representing the 'broadcast'
     * Button to request pictures later on
    */

    //Create a global namespace.
    //While this is not strictly necessary as everything could
    //leave in the closure body assigning objects to this namespace
    //is useful for debugging purpose.
    window.DEMO = {};

    var DEMO = window.DEMO, defaultTags = ['dude'],
    fetchPhotos, addPhotos, errorHandler, photoTemplate, gallery = $('.photos'), memberTemplate, memberCounter = 1, messageTemplate;

    DEMO.M = Magellan();
    
    /*Just a simple template to wrap the photos from Flickr*/
    photoTemplate = '<li class="photo-item"><div class="photo" style="background-image:url({SRC})"></div>'+
                    '<div class="title" contenteditable="true">{TITLE}</div><span class="close"></span></li>';
    memberTemplate = '<li class="{MEMBER_ID}"><img src="http://flickholdr.com/32/32/person/{COUNTER}" alt="{MEMBER_NAME}" /><h4>{MEMBER_NAME}</h4></li>';
    messageTemplate = '<h3>{TITLE}</h3><p>{TEXT}</p>';

    DEMO.M.join(null, 'test-group');

    DEMO.M.registerEventHandler(Magellan.Event.join, function(d){
        //console.log(d);
        var li = $(memberTemplate.replace(/\{COUNTER\}/, memberCounter++).replace(/\{MEMBER_NAME\}/g, d.display).replace(/\{MEMBER_ID\}/, d.node));
        li.data('magellan-node', d.node);
        li.droppable({
            drop: function(event, ui){
                    var photo = ui.draggable.data('photo');
                    DEMO.M.transfer($(this).data('magellan-node'), photo);
                },
                hoverClass: 'hovering',
                scope: 'transfer',
                tolerance: 'pointer'
        });
        $('.members').append(li);
    });

    DEMO.M.registerEventHandler(Magellan.Event.leave, function(d){
        console.log(d);
        $('.members').children('.' + d.node).remove();
    });

    DEMO.M.registerEventHandler(Magellan.Event.transfer, function(d){
        var li = $(photoTemplate.replace(/\{SRC\}/, d.payload.src)
                                .replace(/\{TITLE\}/, d.payload.title || 'No title'));
        li.data('photo', d.payload);
        li.draggable({
            scope: 'transfer',
            helper: 'clone',
            appendTo: 'body',
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
        gallery.append(li.addClass('shared'));
    });

    $(window).unload(function(){
        if (DEMO.M) {DEMO.M.leave();}
    });

    /*Add photos to the DOM and make them draggable, thanks jQuery UI.*/
    addPhotos = function(photos){
        photos.forEach(function(photo){
            var li = $(photoTemplate.replace(/\{SRC\}/, photo.media.m)
                                    .replace(/\{TITLE\}/, photo.title || 'No title'));
            li.data('photo', {src: photo.media.m, title: photo.title});
            li.draggable({
                scope: 'transfer',
                helper: 'clone',
                appendTo: 'body',
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
    fetchPhotos = function(tags){
        $.ajax({
            url: 'http://api.flickr.com/services/feeds/photos_public.gne?format=json&tags='+tags.join(),
            success: function(response){
                if (response.items && response.items.length > 0) {
                    addPhotos(response.items);
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

    $('.init-form a').on('click', function(){
        var userTags = $('#tags').val();
        $('.init-form').fadeTo(500, 0, function(){$(this).hide();});
        if ($(this).hasClass('fetch')) {
            fetchPhotos(userTags.length > 0 ? userTags.replace(/\s/g, '').split(',') : defaultTags);
        }
        else if ($(this).hasClass('empty')) {
            //gallery.empty();
        }
    });

    $(document).on('click', 'li.photo-item .close', function(){
        $(this).parent().fadeTo(500, 0, function(){$(this).remove()});
    });
});