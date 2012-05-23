(function(window){
    'use strict';
    var Magellan = window.Magellan = function(){
            if (!(this instanceof Magellan)) {
                return new Magellan();
            }
        },
        Settings = {
            server: 'http://192.168.5.103:8001',
            useLocalStorage: true
        },
        Messages = {
            join: 'J',
            leave: 'L',
            transfer: 'T'
        }, $M,
        socket,
        eventHandlers = {},
        buildMessage,
        buildJoinMessage,
        buildLeaveMessage,
        buildTransferMessage,
        randomizeGroupName,
        extractGroupNameFromUrl,
        randomizeNodeName,
        getNodeNameFromLocalStorage,
        setNodeNameInLocalStorage,
        removeNodeNameFromLocalStorage,
        globalEventHandler;

        $M = Magellan.prototype;
        Magellan.defaults = Settings; //Mostly for testing purpose
        Magellan.Event = Messages;
        Magellan.getLocationObject = function(){ //Easier to test this way
            return window.location;
        };

        buildMessage = function(type, content){
            var message = {type: type}, p;
            for (p in content) {
                if (content.hasOwnProperty(p)) {
                    message[p] = content[p];
                }
            }
            return message;
        };

        buildJoinMessage = function(nodeName, groupName, displayName) {
            return buildMessage(Messages.join, {node: nodeName, group: groupName, display: displayName});
        };

        buildLeaveMessage = function(nodeName, groupName) {
            return buildMessage(Messages.leave, {node: nodeName, group: groupName});
        };

        buildTransferMessage = function(nodeName, groupName, payload) {
            return buildMessage(Messages.transfer, {node: nodeName, group: groupName, payload: payload});
        };

        randomizeGroupName = function(){
            return 'group-' + Math.random().toFixed(5).replace(/\./, '') + '-' + Math.sqrt(Date.now()).toString().replace(/^\d+\./, '');
        };

        extractGroupNameFromUrl = function(){
            var params = {};
            Magellan.getLocationObject().search.replace(
                /([^?=&]+)(=([^&]*))?/g,
                function($0, $1, $2, $3) { params[$1] = $3; }
            );
            return params.g || null;
        };

        randomizeNodeName = function(){
            return 'node-' + Math.random().toFixed(5).replace(/\./, '-');
        };

        getNodeNameFromLocalStorage = function(){
            return localStorage.getItem('magellan-node-name');
        };

        setNodeNameInLocalStorage = function(name){
            return localStorage.setItem('magellan-node-name', name);
        };

        removeNodeNameFromLocalStorage = function(){
            return localStorage.removeItem('magellan-node-name');
        };

        globalEventHandler = function(data){
            var handlerId;
            for (handlerId in eventHandlers) {
                if (eventHandlers.hasOwnProperty(handlerId) &&
                    eventHandlers[handlerId].type === data.type) {
                    eventHandlers[handlerId].handler.call(data, data);
                }
            }
        };

        $M.join = function(nodeName, groupName, displayName) {
            if (Settings.useLocalStorage) {
                nodeName = nodeName || getNodeNameFromLocalStorage();
            }
            nodeName = nodeName || randomizeNodeName();
            groupName = groupName || extractGroupNameFromUrl() || randomizeGroupName();
            displayName = displayName || nodeName;

            //Set properties of this for future use
            $M.node = nodeName;
            $M.group = groupName;
            $M.displayName = displayName;
            if (Settings.useLocalStorage) {
                setNodeNameInLocalStorage(nodeName);
            }

            socket = io.connect(Settings.server);
            socket.on('magellan', globalEventHandler);
            socket.on('disconnect', function(){});
            socket.emit('magellan', buildJoinMessage(nodeName, groupName, displayName));
        };

        $M.registerEventHandler = function(eventType, handler) {
            var handlerId = 'eh-' + Math.random().toFixed(3).replace(/\./, '-');
            eventHandlers[handlerId] = {type: eventType, handler: handler};
            return handlerId;
        };

        $M.deregisterEventHandler = function(handlerId) {
            if (eventHandlers[handlerId]) {
                delete eventHandlers[handlerId];
                return true;
            }
            return false;
        };

        /* @method
         * Leaves the group and disconnect the socket.
         */
        $M.leave = function(){
            socket.emit('magellan', buildLeaveMessage(this.node, this.group));
            socket.disconnect();
        };

        /* @method
         * Transfers some object to one or more nodes.
         * @param destNode destination node id or '*' to transfer object
         *        to all the nodes in the group
         * @param object the object to transfer
         */
        $M.transfer = function(destNode, object){
            socket.emit('magellan', buildTransferMessage(destNode, this.group, object));
        };

        $M.cleanUp = function(){
            removeNodeNameFromLocalStorage();
        };

})(this);
