# gamesparks-node #


## Introduction ##

This library provides communication capability between node.js and the GameSparks platform.

This allows node.js to send requests and receive the responses from the platform on behalf of players.

Sockets can also be configured to optionally listen for push messages to a particular player.

Include the library as you would any other module

	var gameSparks = new require('../../gamesparks-node/GameSparks.js');
	
The library can be configured to connect to either the development, or live servers and also be configured as a sender (request/response) or a listener (push messages)	

Listener configurations are capable of sending requests, senders can never receive messages.

## Initialisation Options ##

You need to select an initialisation option. The library can only be initialised once, subsequent calls to initialisation are ignored.

### Initialise as a sender to the development servers. No push messages will be received. ###

    gameSparks.initPreviewSender(gameApiKey, secret, socketCount, onInit)

### Initialises as a listener to the development servers. Push messages will be received.	###

    gameSparks.initPreviewListener(gameApiKey, secret, socketCount, onMessage, onInit)
	
### Initialises as a sender to the live servers. No push messages will be received. ###

    gameSparks.initLiveSender(gameApiKey, secret, socketCount, onInit);

### Initialises as a listener to the live servers. Push messages will be received. ###
	
    gameSparks.initLiveListener(gameApiKey, secret, socketCount, onMessage, onInit);
    
### Initialse as a sender with a url

	gameSparks.init("wss://service.gamesparks.net/ws/server/{gameApiKey}", secret, 10, onMessage, onInit);    

### Initialse as a listener with a url

	gameSparks.init("wss://service.gamesparks.net/ws/server-send/{gameApiKey}", secret, 10, onMessage, onInit);    

### Parameters ###

* gameApiKey - The is the apiKey of you game within the gamesparks platform. This value is available through the portal.
* secret - This is the server secret for you game. You will need to request this value for each game you want to use. IT IS NOT THE API SECRET in the portal. A different secret is configured for server to server communications as the access permissions are elevated.
* socketCount - The maximum number of open sockets to maintain between platforms. Suggest a relativly low number (20) to start with in development. The maximum number for development servers is 50.
* onMessage(listeners only) - Provide the function you want to be called when a message is received. This method will be passed the json object received from the server as the first parameter.
* onInit - A callback function that is invoken when the SDK connects sucessfully to gamesparks

## Checking State ##

You can check whether the SDk is ready to send a request using the following code.

var ready = gameSparks.isReady();

## Sending Requests ##

To send a request, you need to construct the JSON data you want to send, and call the following method

    gameSparks.sendAs(playerId, requestType, data, onResponse)

### Parameters ###

* playerId - The ID of the player you are sending the request for
* requestType - The type of request. For posting scores this will be "LogEventRequest" but other calls are available.
* data - The additional data to pass as part of the request. See the example further down.
* onResponse - Your function to process the response from gamesparks.

## Sending a score ##
 
Assumes you have an event configured with event code HIGH_SCORE, and a single attribute named "SCORE".

Also assumes a player exists with the id "1234567890"

	gameSparks.sendAs(
			"1234567890", 
			"LogEventRequest", 
			{"eventKey" : "HIGH_SCORE", "SCORE" : 1000}, 
			function(response){console.log(JSON.stringify(response))}
	);

## Getting the global top 5 of a leaderbord ##

Assumes you have a leaderboard with short code "LB1" and a player exists with the id "1234567890"

	gameSparks.sendAs(
			"1234567890", 
			"LeaderboardDataRequest", 
			{"leaderboardShortCode": "LB1","social": "false","entryCount": "5","offset": "0"}, 
			function(response){console.log(JSON.stringify(response))}
	);







