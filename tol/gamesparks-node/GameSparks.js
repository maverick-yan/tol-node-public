var GameSparksAdminSocket = new require('./GameSparksAdminSocket').socket;
var poolModule = require('./generic-pool');

var pool = null;
var socketNumber = 0;

function initSender(url, secret, socketCount, onMessage, onSocketError) {
	if(pool !== null){
		console.log("GameSparks already initialised");
		return;
	}
	pool = poolModule.Pool({
		name : 'gamesparks',
		create : function(callback) {
		    ++socketNumber;
			var gameSparksAdminSocket = new GameSparksAdminSocket();
			gameSparksAdminSocket.init({
				url : url,
				secret : secret,
				onInit : function() {
					callback(null, gameSparksAdminSocket);
				},
				onError : function (error) {
				    if (onSocketError) {
				        onSocketError(error);
				    }

                    // Report to the pool that there was an error on this socket and it should throw it away
				    callback(error, gameSparksAdminSocket);
				},
				onMessage : onMessage,
			    debug : false,
			    socketNumber: socketNumber
			});
		},
		destroy : function(gameSparksAdminSocket) {
			gameSparksAdminSocket.close();
		},
		validate : function(gameSparksAdminSocket) {
			return gameSparksAdminSocket.ready();
		},
		max : socketCount,
		min : 10,
		idleTimeoutMillis : 30000,
		log: false,
		refreshIdle : false
	});
}

exports.init = function(url, secret, socketCount, onError){
	initSender(url, secret, socketCount, null, onError);
};

exports.initLiveSender = function(gameApiKey, secret, socketCount, onError){
	initSender("wss://service.gamesparks.net/ws/server-send/" + gameApiKey, secret, socketCount, null, onError);
};

exports.initLiveListener = function(gameApiKey, secret, socketCount, onMessage, onError){
	initSender("wss://service.gamesparks.net/ws/server/" + gameApiKey, secret, socketCount, onMessage, onError);
};

exports.initPreviewSender = function(gameApiKey, secret, socketCount, onError){
	initSender("wss://preview.gamesparks.net/ws/server-send/" + gameApiKey, secret, socketCount, null, onError);
};

exports.initPreviewListener = function(gameApiKey, secret, socketCount, onMessage, onError){
	initSender("wss://preview.gamesparks.net/ws/server/" + gameApiKey, secret, socketCount, onMessage, onError);
};

//Added an onError handler that can be informed there was an error
exports.sendAs = function(playerId, requestType, data, onResponse, onError) {
    
    if (pool === null) {
        var err = new Error('Pool not initialised');
        if(onError){
            onError(err)
        } else {
            //throw err;
            console.log(err);
        }
	} else {
		if(data == null){
			data = {};
		}
		data.playerId = playerId;
		pool.acquire(function(err, client) {
			if (err) {
				if(onError){
	            	onError(err)
				}
				console.log(err);
			} else {
				client.sendWithData(requestType, data, function(response) {
					if(onResponse){
						onResponse(response);
					}
					pool.release(client);
				});
			}
		});
	}
};
