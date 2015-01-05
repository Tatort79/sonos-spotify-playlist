var tts = require('node-tts-api');
var needle = require('needle');
var _ = require('underscore');
var Path = require('path');

var SonosDiscovery = require('sonos-discovery');

var discovery = new SonosDiscovery({});


var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
  clientId : 'cd59aed74ddb4ec89e141113374bf737',
  clientSecret : '109e40ad8ad54d2a9cb03b43b429b1d8'
});

// Retrieve an access token
spotifyApi.clientCredentialsGrant()
  .then(function(data) {
    console.log('The access token expires in ' + data['expires_in']);
    console.log('The access token is ' + data['access_token']);

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data['access_token']);
  }, function(err) {
    console.log('Something went wrong when retrieving an access token');
    console.log(err);
  });

var getMetadata = function(uri) {

	var metadata='<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">';
	metadata += '<item id="10060a6c' + uri + '" parentID="100a0664playlists" restricted="true">';
	metadata += '<dc:title>Silvesterparty Deluxe</dc:title>';
	metadata += '<upnp:class>object.container.playlistContainer</upnp:class>';
	metadata += '<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">SA_RINCON2311_X_#Svc2311-0-Token</desc>';
	metadata += '</item></DIDL-Lite>';
	return metadata;
}


var player = null;

// Wait until the Sonos discovery process is done, then grab our player
discovery.on('topology-change', function(info) {
	player = discovery.getPlayer('Küche');
});

var Hapi = require('hapi');

	var server = new Hapi.Server();
	server.connection({ port: 8001 });

	server.views({
	    engines: {
	        html: require('handlebars')
	    },
	    path: Path.join(__dirname, 'templates')
	});

	server.route({
	    method: 'GET',
	    path: '/',
		    handler: function (request, reply) {
		       reply.view('index');
		    }
	});

	server.route({
	    method: 'GET',
	    path: '/zone',
		    handler: function (request, reply) {
		        reply(discovery.getZones());
		    }
	});

	server.route({
	    method: 'GET',
	    path: '/state',
		    handler: function (request, reply) {
		        reply(discovery.getZones());
		    }
	});
	
	server.route({
	    method: 'GET',
	    path: '/playlist/today',
		    handler: function (request, reply) {

		    	needle.get('https://api.tunigo.com/v3/space/featured-playlists?per_page=100&region=de', function(error, response) {
				 
				 var playlists = [];

				 
				  _.each(response.body.items, function(item) {
				  	  playlists.push({
				  	  	 title : item.playlist.title,
				  	  	 description : item.playlist.description,
				  	  	 uri: item.playlist.uri,
				  	  	 image: 'https://d3rt1990lpmkn.cloudfront.net/300/' + item.playlist.image

				  	  })
				  })

				  reply.view('playlistList', { playlists : playlists, title: response.body.label });
	           });
		    }
	});

	server.route({
	    method: 'GET',
	    path: '/playlist/genre',
		    handler: function (request, reply) {

		    	needle.get('https://api.tunigo.com/v3/space/all-genres?per_page=100', function(error, response) {
				 
				 
				 var playlists = [];
    			 
				  _.each(response.body.items, function(item) {
				  	  if (item.genre && item.genre.iconUrl) {
				  	  	
				  	  	playlists.push({
				  	  	 title : item.genre.name,
				  	  	 templateName: item.genre.templateName,
				  	  	 image: item.genre.iconUrl
						})

				  	  }
				  	  
				  })

				 reply.view('genreList', { playlists : playlists });
				 
	           });
		  
		    }
	});

	server.route({
	    method: 'GET',
	    path: '/playlist/user/{userId}',
		    handler: function (request, reply) {
		    	spotifyApi.getUserPlaylists(request.params.userId, { "limit" : 50})
				  .then(function(data) {
				  	console.log(data.total);
				 	var playlists = [];
 
				  	_.each(data.items, function(item) {

				  		var playlist = {
					  	  	 title : item.name,
					  	  	 description : item.name,
					  	  	 uri: item.id, // Need to be converted to the URI
					  	}

				  	  if (item.images.length > 0 && item.images[0].url) {
				  	  	playlist.image = item.images[0].url;
				  	  	playlists.push(playlist);
				  	  } 
				  	 

				  	 
			
				  	})

				  	var playlistTitle = 'Playlists from User : ' + request.params.userId; 

				  	reply.view('playlistList', { playlists : playlists, title: playlistTitle });
	         

				  },function(err) {
				    console.log('Something went wrong!', err);
				  });

		    
		    }
	});


	


	server.route({
	    method: 'GET',
	    path: '/playlist/{templateKey}',
		    handler: function (request, reply) {

		    	needle.get('https://api.tunigo.com/v3/space/' + request.params.templateKey + '?per_page=100', function(error, response) {
				 
				 var playlists = [];

				 
				  _.each(response.body.items, function(item) {
				  	  playlists.push({
				  	  	 title : item.playlist.title,
				  	  	 description : item.playlist.description,
				  	  	 uri: item.playlist.uri,
				  	  	 image: 'https://d3rt1990lpmkn.cloudfront.net/300/' + item.playlist.image

				  	  })
				  })

				  reply.view('playlistList', { playlists : playlists, title: response.body.space });
	           });

		    	
		    	
		  
		    }
	});

	


	server.route({
	    method: 'GET',
	    path: '/sonos/playlist/{playlistId}',
		    handler: function (request, reply) {

	    		var encodedUri = "x-rincon-cpcontainer:10060a6c" + encodeURIComponent(request.params.playlistId);
			
				player.removeAllTracksFromQueue(function (success) {
				  console.log("Remove all tracks : " + success)
				  if (success) {
				  	player.addURIToQueue(encodedUri, getMetadata(encodeURIComponent(request.params.playlistId)), function(success, res) {
				  	console.log("Add to Queue: " + success);
				  		player.play(function() {
				  			reply(encodedUri);
                       
                    	});
				  	});

				  } else {
				  	reply("Can´t remove all tracks");
				  }
				  
				});
			 }
	});

   
	server.start(function () {
	    console.log('Server running at:', server.info.uri);
	});

