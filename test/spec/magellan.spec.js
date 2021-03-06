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

 
describe('Magellan [Discovery Module]', function(){
	var magellanObject, io, socket;

	beforeEach(function() {
		//io.connect & socket object mock
		socket = {
			emit: jasmine.createSpy('Socket.io::socket::emit'),
			on: jasmine.createSpy('Socket.io::socket::on'),
			disconnect: jasmine.createSpy('Socket.io::socket::disconnect'),
		};
		//Intentionally global
		io = window.io = {
			connect: jasmine.createSpy('Socket.io::connect').andReturn(socket)
		};
	});

	describe('Discovery', function(){
		beforeEach(function(){
			magellanObject = Magellan();
		});
		afterEach(function(){
			magellanObject.tearDown();
			magellanObject = null;
		});
		it('Should attempt a connection and join/create a group ' +
			'and setup the necessary listeners.', function(){
			magellanObject.join('node-0-123456', 'group-0234-3212532521');
			expect(io.connect).toHaveBeenCalledWith(Magellan.defaults.server);
			expect(socket.emit).toHaveBeenCalledWith('magellan', {type: 'J',
				                                      node: 'node-0-123456',
				                                      group: 'group-0234-3212532521',
				                                  	  display: 'node-0-123456'});
			expect(socket.on).toHaveBeenCalledWith('magellan', jasmine.any(Function));
			//expect(socket.on).toHaveBeenCalledWith('disconnect', jasmine.any(Function));
		});
		it('Should attempt a connection and join/create a group ' +
			'and setup the necessary listeners. ' +
			'Node and group are randomly generated, display name is set.', function(){
			magellanObject.join(null, null, 'The Monkey');
			expect(io.connect).toHaveBeenCalledWith(Magellan.defaults.server);
			expect(socket.emit).toHaveBeenCalledWith('magellan', {type: 'J',
				                                      node: jasmine.any(String),
				                                      group: jasmine.any(String),
				                                  	  display: 'The Monkey'});
			expect(socket.on).toHaveBeenCalledWith('magellan', jasmine.any(Function));
			//expect(socket.on).toHaveBeenCalledWith('disconnect', jasmine.any(Function));
		});
		it('Should attempt a connection and join/create a group ' +
			'and setup the necessary listeners. ' +
			'A display name is also specified.', function(){
			magellanObject.join('node-0-123456', 'group-0234-3212532521', 'The Monkey');
			expect(io.connect).toHaveBeenCalledWith(Magellan.defaults.server);
			expect(socket.emit).toHaveBeenCalledWith('magellan', {type: 'J',
				                                      node: 'node-0-123456',
				                                      group: 'group-0234-3212532521',
				                                  	  display: 'The Monkey'});
			expect(socket.on).toHaveBeenCalledWith('magellan', jasmine.any(Function));
			//expect(socket.on).toHaveBeenCalledWith('disconnect', jasmine.any(Function));
		});
		it('Should attempt a connection and join/create the group specified in the URL ' +
			'and setup the necessary listeners.', function(){
			var mockedLocation = {
				search: '?g=monkey-group'
			};
			Magellan.getLocationObject = jasmine.createSpy('getLocationObject').andReturn(mockedLocation);
			magellanObject.join('node-0-123456');
			expect(Magellan.getLocationObject).toHaveBeenCalled();
			expect(io.connect).toHaveBeenCalledWith(Magellan.defaults.server);
			expect(socket.emit).toHaveBeenCalledWith('magellan', {type: 'J',
				                                      node: 'node-0-123456',
				                                      group: 'monkey-group',
				                                      display: 'node-0-123456'});
			expect(socket.on).toHaveBeenCalledWith('magellan', jasmine.any(Function));
			//expect(socket.on).toHaveBeenCalledWith('disconnect', jasmine.any(Function));
		});
		it('Should disconnect properly.', function(){
			magellanObject.join('node-0-123456', 'group-0234-3212532521');
			magellanObject.leave();
			expect(socket.emit).toHaveBeenCalledWith('magellan', {type: 'L',
				                                      node: 'node-0-123456',
				                                      group: 'group-0234-3212532521'});
			expect(socket.disconnect).toHaveBeenCalledWith();
		});
		it('Should register an event handler and generate a random ID for it.', function(){
			var handlerId = magellanObject.registerEventHandler(Magellan.Event.leave, function(){});
			expect(handlerId).toMatch(/^eh-\d{1,3}/);
		});
		it('Should do nothing and return false when deregistering a non-existing event handler.', function(){
			var deregistered = magellanObject.deregisterEventHandler('eh-non-existing');
			expect(deregistered).toBe(false);
		});
		it('Should deregister an event handler that was previuosly registered.', function(){
			var handlerId = magellanObject.registerEventHandler(Magellan.Event.leave, function(){});
			var deregistered = magellanObject.deregisterEventHandler(handlerId);
			expect(deregistered).toBe(true);
		});
		it('Should start transferring an object to the other end.', function(){
			magellanObject.join('node-0-123456', 'group-0234-3212532521');
			magellanObject.transfer('node-0-654321', {foo: 'bar'});
			expect(socket.emit).toHaveBeenCalledWith('magellan', {type: 'T',
				                                      node: 'node-0-654321',
				                                      group: 'group-0234-3212532521',
				                                  	  payload: {foo: 'bar'},
				                                  	  sender: 'node-0-123456'});
		});
	});
});