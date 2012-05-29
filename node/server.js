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

var app = require('express').createServer(),
    io = require('socket.io').listen(app),
    http = require('http');

io.set('log level', 1);

app.listen(8001);

var groups = {}, sockets = {}, ASSIGN_GROUP = 'm.group.assign',
    RANDOM_GROUP_NAMES = ['Nyz','Burlt','Irc','Zhayn','Lour','Ormk','Swayn','Itnt','Itany','Thik','Edray','Erake','Oquea','Einei','Dayr','Achl','Ebany','Yurnu','Irisa','Jor','Sloup','Ackk','Arr','Ylore','Banb','Cerr','Isw','Alerr','Sniep','Yano','Opoli','Irn','Tanw','Reent','Suint','Otaso','Samst','Tonm','Irph','Awaro','Aquai','Kaed','Aughl','Eldd','Torl','Eati','Ashb','Certh','Iriso','Snud','Yiau','Meush','Alyee','Ysami','Nish','Ems','Asrt','Yomy','Irs','Rayl','Risnn','Onyi','Yustu','Ormr','Pall','Treysh','Yasy','Iskela','Otona','Enthgh','Isi','Zial','Athl','Aquee','Verph','Esero','Orl','Neard','Gaut','Iall','Elmz','Engr','Austu','Yighta','Soc','Udane','Emy','Layd','Nielt','Whird','Fif','Uene','Adp','Issl','Hinp','Thraeph','Lild','Deyb','Ildd','Sayk','Echt','Piant','Uilde','Ikina','Enq','Lyel','Tond','Burk','Chaq','Doiy','Atz','Garl','Iasho','Aunta','Shyt','Quard','Struich','Ykina','Umlt'],
    FLICKR_PATH = '/services/feeds/photos_public.gne?format=json&nojsoncallback=1&tagmode=any&tags=',
    FLICK_TAGS = ['monkey','cat','funny','sexy','beer','drunk','banana','dog','dude','people','dance','rock','zombie'],
    flickrCache = [],
    httpRequestOptions = {
        host: 'api.flickr.com',
        port: 80,
        path: null
    },
    BOT = {
        node: 'node-418648354825482-R2-D2',
        group: 'group-418648354825482-R2-D2',
        display: 'R2-D2'
    };

var getFlickrPhotos = function(){
    var random = Math.floor(Math.random()*(FLICK_TAGS.length-1)),
        tags = FLICK_TAGS.slice(random,random+2).join(',');
        tags='monkey,cat';
    httpRequestOptions.path = FLICKR_PATH + tags;

    http.get(httpRequestOptions, function(res) {
        var data = '';
        res.on('data', function(chunk){
            data += chunk;
        }).on('end', function(o){
            //Sanitize JSON
            data= data.replace(/\\\//g, '/').replace(/\\'/g, "'");
            try {
                var json = JSON.parse(data);
                if (json.items && json.items.length > 0) {
                    json.items.forEach(function(item){
                        var photo = {src: item.media.m, title: item.title, link: item.link};
                        flickrCache.unshift(photo);
                    });
                }
                //Keep a max size
                if(flickrCache.length > 500) {
                    flickrCache.length = 500;
                }
                //Runs approximately 5 times per hour
                setTimeout(getFlickrPhotos, 360000);
            }
            catch (e) {
                console.log(e);
                getFlickrPhotos();
            }
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
},
nodeAtIndexOf = function(node, array){
    var j;
    if (array) {
        for (j = 0; j < array.length; j++) {
            if (node === array[j].node) {
                return j;
            }
        }
    }
    return -1;
},
getRandomGroup = function(){
    var group, g;
    for (g in groups) {
        if (groups.hasOwnProperty(g) && groups[g].length < 10) {
            group = g;
        }
    }
    if (!group) {
        group = RANDOM_GROUP_NAMES[Math.floor(RANDOM_GROUP_NAMES.length * Math.random())];
    }
    return group;
},
buildMessage = function(type, content){
    var message = {type: type}, p;
    for (p in content) {
        if (content.hasOwnProperty(p)) {
            message[p] = content[p];
        }
    }
    return message;
},

buildJoinMessage = function(nodeName, groupName, displayName) {
    return buildMessage('J', {node: nodeName, group: groupName, display: displayName});
},

buildLeaveMessage = function(nodeName, groupName, displayName) {
    return buildMessage('L', {node: nodeName, group: groupName, display: displayName});
},

buildTransferMessage = function(nodeName, groupName, payload, sender){
    return buildMessage('T', {node: nodeName, group: groupName, payload: payload, sender: sender});
},

buildAssignGroupMessage = function(groupName){
    return buildMessage('G', {group: groupName});
};

var registerMagellanHandlers = function(socket) {
    socket.on('magellan', function(data){
        var index, socketId = this.id, nodeInfoObj;
        //console.log('[Magellan]', data);
        switch(data.type) {
            case 'J':
                if (data.group === ASSIGN_GROUP) {
                    data.group = getRandomGroup();
                    socket.emit('magellan', buildAssignGroupMessage(data.group));
                }
                //data = {type: 'J', node: String, group: String, display: String}
                if(!groups[data.group]) {
                    //First node in the group
                    groups[data.group] = [];
                }
                else {
                    //There are already other nodes in the group: notify 'em all
                    groups[data.group].forEach(function(peer){
                       peer.endpoint.emit('magellan', data);
                       //Also notify the joiner about everybody else in the group
                       socket.emit('magellan', buildJoinMessage(peer.node, peer.group, peer.display));
                    });
                }
                //Let's also add a fake node for the BOT
                socket.emit('magellan', buildJoinMessage(BOT.node, BOT.group, BOT.display));
                nodeInfoObj = {node: data.node, endpoint: socket, display: data.display, group: data.group};
                sockets[socketId] = {index: groups[data.group].push(nodeInfoObj) - 1, group: data.group};
                break;
            case 'L':

                break;
            case 'T':
                if (data.node === "*") {
                    groups[data.group].forEach(function(peer){
                        if (peer.node !== data.sender) {
                            peer.endpoint.emit('magellan', data);
                        }
                    });
                }
                else if (data.node === BOT.node) {
                    //A user sent a photo to the bot. Just ignore it and send back a random photo,
                    //if any.
                    if (flickrCache.length > 0) {
                        var random = Math.floor(Math.random()*(flickrCache.length));
                        socket.emit('magellan', buildTransferMessage(data.node, BOT.group, flickrCache[random], BOT.node));
                    }
                }
                else if ((index = nodeAtIndexOf(data.node, groups[data.group])) !== -1) {
                     groups[data.group][index].endpoint.emit('magellan', data);
                }
                break;
        }
    });
    socket.on('disconnect', function() {
        //console.log('[Magellan] Disconnect');
        if (sockets[this.id]) {
            //Where is the current 'leaver' in the group array?
            var index = sockets[this.id].index;
            //Get rif of it a keep a copy
            var left = groups[sockets[this.id].group].splice(index, 1)[0];

            //Notify everybody else in the group the node left
            groups[sockets[this.id].group].forEach(function(peer){
                peer.endpoint.emit('magellan', buildLeaveMessage(left.node, left.group, left.display));
            });

            //Remove the object that stores the reference to it in the sockets hashtable
            delete sockets[this.id];

            //Now, here is the trick: since we removed a node from the node array at position *index*,
            //all the indexes > *index* changed and have to be decremented by one. Sorry for the confusion.
            for (var s in sockets) {
                if (sockets.hasOwnProperty(s)) {
                    if (sockets[s].index > index) {
                        sockets[s].index = sockets[s].index - 1;
                    }
                }
            }
        }
    });
};

io.sockets.on('connection', function(socket) {
    //console.log('Somebody connected');
    registerMagellanHandlers(socket);
});


getFlickrPhotos();