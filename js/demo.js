$(function(){

    /* @todo:
     * Error handler
     * Extract AJAX call into a function, to make it optional (i.e. at the
     * beginning a user may start with an empty set)
     * Choose group name or join a random one (node.js support for this)
     * Hook up with Magellan for discovery & messaging
     * Photo received UI + comment back
     * Add fake member representing the 'broadcast'
     * Unload event in FF
     * Button to request pictures later on
    */

    //Create a global namespace.
    //While this is not strictly necessary as everything could
    //leave in the closure body assigning objects to this namespace
    //is useful for debugging purpose.
    window.DEMO = {};

    var DEMO = window.DEMO, defaultTags = ['dude'],
    fetchPhotos, addPhotos, errorHandler, photoTemplate, gallery = $('.photos'), memberTemplate, memberCounter = 1;

    DEMO.M = Magellan();
    
    /*Just a simple template to wrap the photos from Flickr*/
    photoTemplate = '<li class="photo-item"><div class="photo" style="background-image:url({SRC})"></div>'+
                    '<div class="title" contenteditable="true">{TITLE}</div></li>';
    memberTemplate = '<li class="{MEMBER_ID}"><img src="http://flickholdr.com/32/32/person/{COUNTER}" alt="{MEMBER_NAME}" /><h4>{MEMBER_NAME}</h4></li>';

    DEMO.M.join(null, 'test-group');

    DEMO.M.registerEventHandler(Magellan.Event.join, function(d){
        console.log(d);
        var li = $(memberTemplate.replace(/\{COUNTER\}/, memberCounter++).replace(/\{MEMBER_NAME\}/g, d.display).replace(/\{MEMBER_ID\}/, d.node));
        li.data('magellan', d);
        li.droppable({
            drop: function(event, ui){
                    /*
                    var settings = ui.draggable.data('settings');
                    if (settings.type === 'video') {
                        settings.time = $('#video')[0].getCurrentTime() || 0;
                    }
                    m.transfer($(this).data('node'), settings);
                    ui.draggable.remove();
                    */
                    console.log(ui.draggable.data('photo'));
                },
                hoverClass: 'hovering',
                scope: 'transfer',
                tolerance: 'pointer'
        });
        $('.members').append(li);
    });

    DEMO.M.registerEventHandler(Magellan.Event.leave, function(d){
        $('.members').children('.' + d.node).remove();
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
            gallery.empty();
        }
    });
});