var Rivulet        = require('../index'),
    assert         = require('assert'),
    sinon          = require('sinon'),
    mockery        = require('mockery'),
    EventEmitter   = require('events').EventEmitter;

function createServerRequest(url) {
  return {
    res: {
      write: sinon.spy(),
      writeHead: sinon.spy()
    },
    req: {
      url: url,
      socket: {
        setTimeout: sinon.spy()
      },
      connection: new EventEmitter()
    },
    next: sinon.spy()
  }
}

describe('Rivulet', function() {

  describe('normal operation', function() {
    var streamMock = {
      pipe: sinon.spy()
    }

    var fsMock = {
      createReadStream: sinon.stub().returns(streamMock)
    }

    mockery.enable({ useCleanCache: true });
    mockery.registerMock('fs', fsMock);

    var Rivulet    = require('../index'),
        filePath   = 'here I am',
        rivulet    = new Rivulet(null, 'rivulets', { polyfill: filePath }),
        middleware = rivulet.middleware();

    describe('with a polyfill path', function() {

      it('should return the polyfile js file', function(done) {
        response = createServerRequest('/rivulets/event-source.js');
        middleware(response.req, response.res, response.next);
        assert.ok(response.res.writeHead.calledWith(200, { 'Content-Type': 'application/javascript' }));
        assert.ok(fsMock.createReadStream.calledWith(filePath));
        assert.ok(streamMock.pipe.calledWith(response.res));
        done();
      });

    });

    describe('with a unknown path', function() {

      it('should move on to the next middleware', function() {
        var path = 'test',
            data = 'HELLO',
            request = createServerRequest('/frogs/test');

        middleware(request.req, request.res, request.next);
        assert.ok(request.next.called);
      });

    });

    describe('with a rivulet path', function() {

      it('should pass along the data', function() {
        var path = 'test',
            data = 'HELLO',
            request = createServerRequest('/rivulets/test');

        middleware(request.req, request.res, request.next);
        rivulet.send(path, data);

        var expected_val = "data: \"" + data + "\"\n\n";

        assert.ok(request.req.socket.setTimeout.calledWith(Infinity));
        assert.ok(request.res.write.calledWith(expected_val));
      });

      it('should pass along the event', function() {
        var path = 'test',
            data = 'HELLO',
            event = 'tricky',
            request = createServerRequest('/rivulets/test');

        middleware(request.req, request.res, request.next);
        rivulet.send(path, data, event);

        var expected_val = "data: \"" + data + "\"\n\n";

        assert.ok(request.req.socket.setTimeout.calledWith(Infinity));
        assert.ok(request.res.write.calledWith("event: " + event + "\n"));
        assert.ok(request.res.write.calledWith(expected_val));
      });

    });


    mockery.deregisterAll();
    mockery.disable();
  });

  describe('Event interface', function() {
    var emitter    = new EventEmitter();
        rivulet    = new Rivulet(emitter, 'streams');
        middleware = rivulet.middleware();

    it('should pass along the data', function() {
      var path = 'test',
          data = 'HELLO',
          request = createServerRequest('/streams/test');

      middleware(request.req, request.res, request.next);
      emitter.emit('streams', path, data);

      var expected_val = "data: \"" + data + "\"\n\n";

      assert.ok(request.req.socket.setTimeout.calledWith(Infinity));
      assert.ok(request.res.write.calledWith(expected_val));
    });

    it('should pass along the event', function() {
      var path = 'test',
          data = 'HELLO',
          event = 'tricky',
          request = createServerRequest('/streams/test');

      middleware(request.req, request.res, request.next);
      emitter.emit('streams', path, data, event);

      var expected_val = "data: \"" + data + "\"\n\n";

      assert.ok(request.req.socket.setTimeout.calledWith(Infinity));
      assert.ok(request.res.write.calledWith("event: " + event + "\n"));
      assert.ok(request.res.write.calledWith(expected_val));
    });

    it('should remove the listener on disconnect', function() {
      var path = 'test',
          data = 'HELLO',
          event = 'tricky',
          request = createServerRequest('/streams/test');

      middleware(request.req, request.res, request.next);
      request.req.connection.emit('close');

      emitter.emit('streams', path, data, event);

      assert.equal(request.res.write.callCount, 0);
    });

  });
});