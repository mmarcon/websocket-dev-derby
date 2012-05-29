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


(function(window){
    'use strict';
    var Magellan = window.Magellan = function(){
            if (!(this instanceof Magellan)) {
                return new Magellan();
            }
        },
        Settings = {
            server: 'wss://photoexplorer.jit.su:80',
            useLocalStorage: false
        },
        Messages = {
            join: 'J',
            leave: 'L',
            transfer: 'T',
            groupassigned: 'G'
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
        Magellan.AssignGroup = 'm.group.assign';
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

        buildTransferMessage = function(nodeName, groupName, payload, sender) {
            return buildMessage(Messages.transfer, {node: nodeName, group: groupName, payload: payload, sender: sender});
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
            return 'node-' + Math.random().toFixed(8).replace(/\./, '-');
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
                    eventHandlers[handlerId].handler.call(this, data);
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
            this.node = nodeName;
            this.group = groupName;
            this.displayName = displayName;
            if (Settings.useLocalStorage) {
                setNodeNameInLocalStorage(nodeName);
            }

            socket = socket || io.connect(Settings.server);
            socket.on('magellan', globalEventHandler);
            //socket.on('disconnect', function(){});

            if(groupName === Magellan.AssignGroup) {
                this.registerEventHandler(Messages.groupassigned, function(data){
                    this.group = data.group;
                });
            }
            else {
                globalEventHandler.call(this, {type: Messages.groupassigned, group: groupName});
            }

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
            if (socket) {
                socket.emit('magellan', buildLeaveMessage(this.node, this.group));
                socket.disconnect();
            }
        };

        /* @method
         * Transfers some object to one or more nodes.
         * @param destNode destination node id or '*' to transfer object
         *        to all the nodes in the group
         * @param object the object to transfer
         */
        $M.transfer = function(destNode, object){
            socket.emit('magellan', buildTransferMessage(destNode, this.group, object, this.node));
        };

        $M.cleanUp = function(){
            removeNodeNameFromLocalStorage();
        };

        $M.tearDown = function(){
            socket = null;
            eventHandlers = {};
        };

})(this);
