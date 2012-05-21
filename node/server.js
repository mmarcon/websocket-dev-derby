var app = require('express').createServer(),
    io = require('socket.io').listen(app);

io.set('log level', 1);

app.listen(8001);

var groups = {}, sockets = {};

var nodeAtIndexOf = function(node, array){
    var j;
    if (array) {
        for (j = 0; j < array.length; j++) {
            if (node === array[j].name) {
                return j;
            }
        }
    }
    return -1;
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
};

var registerMagellanHandlers = function(socket) {
    socket.on('magellan', function(data){
        var index, socketId = this.id;
        console.log('[Magellan]', data);
        switch(data.type) {
            case 'J':
                //data = {type: 'J', node: String, group: String, display: String}
                if(!groups[data.group]) {
                    //First node in the group
                    groups[data.group] = [];
                }
                else {
                    //There are already other nodes in the group: notify 'em all
                    groups[data.group].forEach(function(peer){
                       peer.endpoint.emit('magellan', data);
                    });
                }
                groups[data.group].push({node: data.node, endpoint: socket, display: data.display, group: data.group});
                sockets[this.id] = {node: data.node, endpoint: socket, display: data.display, group: data.group};
                break;
            case 'L':

                break;
            case 'T':

                break;
        }
    });
    socket.on('disconnect', function() {
        console.log('[Magellan] Disconnect');
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