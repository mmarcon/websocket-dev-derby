var app = require('express').createServer(),
    io = require('socket.io').listen(app);

io.set('log level', 1);

app.listen(8001);

var groups = {}, sockets = {}, ASSIGN_GROUP = 'm.group.assign',
    RANDOM_GROUP_NAMES = ['Nyz','Burlt','Irc','Zhayn','Lour','Ormk','Swayn','Itnt','Itany','Thik','Edray','Erake','Oquea','Einei','Dayr','Achl','Ebany','Yurnu','Irisa','Jor','Sloup','Ackk','Arr','Ylore','Banb','Cerr','Isw','Alerr','Sniep','Yano','Opoli','Irn','Tanw','Reent','Suint','Otaso','Samst','Tonm','Irph','Awaro','Aquai','Kaed','Aughl','Eldd','Torl','Eati','Ashb','Certh','Iriso','Snud','Yiau','Meush','Alyee','Ysami','Nish','Ems','Asrt','Yomy','Irs','Rayl','Risnn','Onyi','Yustu','Ormr','Pall','Treysh','Yasy','Iskela','Otona','Enthgh','Isi','Zial','Athl','Aquee','Verph','Esero','Orl','Neard','Gaut','Iall','Elmz','Engr','Austu','Yighta','Soc','Udane','Emy','Layd','Nielt','Whird','Fif','Uene','Adp','Issl','Hinp','Thraeph','Lild','Deyb','Ildd','Sayk','Echt','Piant','Uilde','Ikina','Enq','Lyel','Tond','Burk','Chaq','Doiy','Atz','Garl','Iasho','Aunta','Shyt','Quard','Struich','Ykina','Umlt'];

var nodeAtIndexOf = function(node, array){
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

buildAssignGroupMessage = function(groupName){
    return buildMessage('G', {group: groupName});
};

var registerMagellanHandlers = function(socket) {
    socket.on('magellan', function(data){
        var index, socketId = this.id, nodeInfoObj;
        console.log('[Magellan]', data);
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
                else if ((index = nodeAtIndexOf(data.node, groups[data.group])) !== -1) {
                     groups[data.group][i].endpoint.emit('magellan', data);
                }
                break;
        }
    });
    socket.on('disconnect', function() {
        console.log('[Magellan] Disconnect');
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

// var registerMagellanHandlers = function(socket) {
//  socket.on('magellan', function(data){
//      var index;
//      console.log('-->>',data);
//      switch(data.type) {
//          case 'J':
//              if(!groups[data.group]) {
//                  //First node in the group
//                  groups[data.group] = [];
//              }
//              else {
//                  //There are already other nodes in the group: notify 'em all
//                  groups[data.group].forEach(function(peer){
//                      peer.endpoint.emit('magellan', data);
//                  });
//              }
//              if ((i = nodeAtIndexOf(data.node, groups[data.group])) !== -1) {
//                  groups[data.group].splice(i, 1);
//                  groups[data.group].forEach(function(peer){
//                      peer.endpoint.emit('magellan', data);
//                  });
//              }
//              groups[data.group].forEach(function(peer){
//                  var m = buildJoinMessage(peer.name, 'magellan', peer.display);
//                  socket.emit('magellan', m);
//              });
//              groups[data.group].push({name: data.node, endpoint: socket, display: data.display});
//              break;
//          case 'L':
//              if ((i = nodeAtIndexOf(data.node, groups[data.group])) !== -1) {
//                  groups[data.group].splice(i, 1);
//                  groups[data.group].forEach(function(peer){
//                      peer.endpoint.emit('magellan', data);
//                  });
//              }
//              break;
//          case 'T':
//              if ((i = nodeAtIndexOf(data.node, groups[data.group])) !== -1) {
//                  console.log('-->> Handing over to ' + data.node);
//                  groups[data.group][i].endpoint.emit('magellan', data);
//              }
//              break;
//      }
//  });
//  socket.on('disconnect', function() {
//      console.log('DISCONNECT');
//  });
// };

io.sockets.on('connection', function(socket) {
    console.log('Somebody connected');
    registerMagellanHandlers(socket);
});