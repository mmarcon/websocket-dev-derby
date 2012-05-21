$(window).load(function(){
	var nodeList = $('.nodes ul'),
		nodeTemplate = '<li class="{NODE_NAME}" data-node="{NODE_NAME}"><h4>{NODE_NAME}</h4></li>';

	m = Magellan(); //Global for console-debugging purpose
	m.join(null, 'magellan');
	m.registerEventHandler(Magellan.Event.join, function(d){
		var jNode = $(nodeTemplate.replace(/\{NODE_NAME\}/g, d.node));
		jNode.droppable({
			drop: function(event, ui){
				var settings = ui.draggable.data('settings');
				if (settings.type === 'video') {
					settings.time = $('#video')[0].getCurrentTime() || 0;
				}
				m.transfer($(this).data('node'), settings);
				ui.draggable.remove();
			},
			activeClass: 'dropping',
			hoverClass: 'hovering',
			scope: 'transfer',
			tolerance: 'pointer'
		});
		nodeList.append(jNode);
	});
	m.registerEventHandler(Magellan.Event.leave, function(d){
		nodeList.children('.' + d.node).remove();
	});
	m.registerEventHandler(Magellan.Event.transfer, function(d){
		if(d.payload.type === 'dialog') {
			makeDialog(d.payload).show();
		}
		else if (d.payload.type === 'video') {
			makeYoutubeDialog(d.payload).show();
		}
	});

	function makeDialog(settings) {
		settings.type = 'dialog';
		var d = $('<div class="dialog"/>');
		d.append('<h3>' + settings.title + '</h3>');
		d.append('<div class="dialog-content">' + settings.content + '</div>');
		d.addClass(settings.classes);
		d.hide();
		d.appendTo('.dashboard');

		d.draggable({
			handle: 'h3',
			scope: 'transfer'
		});

		d.data('settings', settings);

		return {
			show: function(){return d.show();},
			hide: function(){return d.hide();},
			remove: function(){return d.remove();},
			data: function(a, b){return d.data(a, b);}
		};
	}

	function makeYoutubeDialog(settings) {
		var dialog, dShow, dom = '<object style="width: 350px; display: block; margin: auto;"><param name="movie" value="https://www.youtube.com/v/u1zgFlCw8Aw?version=3&feature=player_embedded"><param name="allowFullScreen" value="true"><param name="allowScriptAccess" value="always"><embed src="http://www.youtube.com/v/' + settings.videoId + '&hl=en_US&fs=1&enablejsapi=1&" type="application/x-shockwave-flash" allowfullscreen="true" allowScriptAccess="always" width="350" height="280" id="video"></object>';
		settings.content = dom;
		settings.classes = 'youtube';
		dialog = makeDialog(settings);
		settings.type = 'video';
		dialog.data('settings', settings);

		dShow = dialog.show;
		dialog.show = function(){
			dShow();
			setTimeout(function(){
				$('#video')[0].seekTo(settings.time || 0);
				$('#video')[0].playVideo();
			}, 1000);
		};
		return dialog;
	}

	$('.tools').on('click', '.tool', function(e){
		var dialog;
		e.preventDefault();
		if ($(this).data('tool') === 'simple-dialog') {
			dialog = makeDialog({title: 'Simple dialog', content: '<p>Lorem ipsum non amet qui commodo voluptate laboris labore.</p><p>Lorem ipsum non amet qui commodo voluptate laboris labore.</p>'});
			dialog.show();
		}
		else if ($(this).data('tool') === 'youtube-dialog') {
			dialog = makeYoutubeDialog({title: 'Youtube!', videoId: 'hzixp8s4pyg'});
			dialog.show();
		}
		return false;
	});
});
$(window).unload(function(){
	if (m) {m.leave();}
});