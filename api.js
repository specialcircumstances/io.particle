'use strict';

const Homey = require('homey');

module.exports = [

	{
		method: 'GET',
		path: '/authorise',
		fn: function (args, callback) {
			Homey.app.authorise(args).then(
				// API will convert promise to callback
				function(result) {
					//console.log('Received result from func', Object.keys(result));
					//console.log('Body follows: ',Object.keys(result.body));
					if (result.error) {
						console.log('Received Error from func', result.errorDescription);
						return callback(result.errorDescription, null);
					} else {
						console.log('Success. Obtained token:', result.body.access_token);
						return callback( null, result.body );
					}
				}
			).catch(
				function(err) {
					console.log('Caught an error from func', err)
					return callback(err, null);
				}
			);
		}
	},

	{
		method: 'GET',
		path: '/deauthorise',
		fn: function (args, callback) {
			// API will convert promise to callback
			Homey.app.deauthorise().then(
				function(result) {
					//console.log('Received result from func', Object.keys(result));
					//console.log('Body follows: ',Object.keys(result.body));
					if (result.error) {
						console.log('Received Error from func', result.errorDescription);
						return callback(result.errorDescription, null);
					} else {
						console.log('Success. Token deleted.');
						return callback( null, result.body );
					}
				}
			).catch(
				function(err) {
					console.log('Caught an error from func', err)
					return callback(err, null);
				}
			);
		}
	},

	{
		method: 'GET',
		path: '/integrate',
		fn: function (args, callback) {
			// API will convert promise to callback
			Homey.app.integrate().then(
				function(result) {
					//console.log('Received result from func', Object.keys(result));
					//console.log('Body follows: ',Object.keys(result.body));
					if (result.error) {
						console.log('Received Error from func', result.errorDescription);
						return callback(result.errorDescription, null);
					} else {
						console.log('Success. Clouds have been Integrated.');
						return callback( null, result.body );
					}
				}
			).catch(
				function(err) {
					console.log('Caught an error from func', err)
					return callback(err, null);
				}
			);
		}
	},


];
