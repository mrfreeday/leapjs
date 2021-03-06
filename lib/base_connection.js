var chooseProtocol = require('./protocol').chooseProtocol
  , EventEmitter = require('events').EventEmitter
  , _ = require('underscore');

var Connection = exports.Connection = function(opts) {
  this.opts = _.defaults(opts || {}, {
    host : '127.0.0.1',
    enableGestures: false,
    port: 6437,
    enableHeartbeat: true,
    heartbeatInterval: 100
  });
  this.host = opts.host;
  this.port = opts.port;
  this.on('ready', function() {
    this.enableGestures(this.opts.enableGestures);
    if (this.opts.enableHeartbeat) this.startHeartbeat();
  });
  this.on('disconnect', function() {
    if (this.opts.enableHeartbeat) this.stopHeartbeat();
  });
  this.heartbeatTimer = null;
}

Connection.prototype.sendHeartbeat = function() {
  this.setHeartbeatState(true);
  this.protocol.sendHeartbeat(this);
}

Connection.prototype.handleOpen = function() {
  this.emit('connect');
}

Connection.prototype.enableGestures = function(enabled) {
  this.gesturesEnabled = enabled ? true : false;
  this.send(this.protocol.encode({"enableGestures": this.gesturesEnabled}));
}

Connection.prototype.handleClose = function() {
  this.disconnect();
  this.startReconnection();
  this.emit('disconnect');
}

Connection.prototype.startReconnection = function() {
  var connection = this;
  setTimeout(function() { connection.connect() }, 1000);
}

Connection.prototype.disconnect = function() {
  if (!this.socket) return;
  this.teardownSocket();
  delete this.socket;
  delete this.protocol;
}

Connection.prototype.handleData = function(data) {
  var message = JSON.parse(data);
  var messageEvent;
  if (this.protocol === undefined) {
    messageEvent = this.protocol = chooseProtocol(message);
    this.emit('ready');
  } else {
    messageEvent = this.protocol(message);
  }
  this.emit(messageEvent.type, messageEvent);
}

Connection.prototype.connect = function() {
  if (this.socket) return;
  this.socket = this.setupSocket();
  return true;
}

Connection.prototype.send = function(data) {
  this.socket.send(data);
}

Connection.prototype.stopHeartbeat = function() {
  if (!this.heartbeatTimer) return;
  clearInterval(this.heartbeatTimer);
  delete this.heartbeatTimer;
  this.setHeartbeatState(false);
};

Connection.prototype.setHeartbeatState = function(state) {
  if (this.heartbeatState === state) return;
  this.heartbeatState = state;
  this.emit(this.heartbeatState ? 'focus' : 'blur');
};

_.extend(Connection.prototype, EventEmitter.prototype);
