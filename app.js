'use strict';

const Homey = require('homey');
const Particle = require('particle-api-js');
const moment = require('moment');
const crypto = require('crypto');
const hash = crypto.createHash('md5'); //Weak but fast, and sufficient.

var webhookid = Homey.env.WEBHOOK_ID;
var webhooksecret = Homey.env.WEBHOOK_SECRET;
var homeyCloudId = '';
var athomParticleWh;

class ParticleIoT extends Homey.App {

	onInit() {
		this.log('Particle IoT is running...');
		/*
		 * Initialize the Particle API client with a previously obtained accessToken
		 * whenever possible.
		 */
		var accessToken = Homey.ManagerSettings.get('accessToken');
		var particle = new Particle();
		var self=this;

		// Get Homey's Cloud ID
		Homey.ManagerCloud.getHomeyId().then(
			function(result) {
				// save it
				homeyCloudId = result;
				Homey.ManagerSettings.set('homeyCloudId', homeyCloudId);
				self.log('Got Homey ID', homeyCloudId);
				return homeyCloudId
			},
			function(err) {
				// Error getting Homey ID
				self.error('Error: could not find Homey ID', err, homeyCloudId);
				Homey.ManagerSettings.unset('homeyCloudId');
				homeyCloudId = null;
				throw Error({error:'no_homey_cloud_id'});
			}
		).then(
			function(result) {
				var data = { id: result	};
				// Have HomeyCloudID, so let's get the webook up.
				athomParticleWh = new Homey.CloudWebhook( webhookid, webhooksecret, data );
				// self.log('Create webhook object with data: ', data);
				athomParticleWh.on('message', args => {	self.webhookreceiver(args); });
				// self.log('Have set webhook on message');
				athomParticleWh.register()
				        .then(() => {
										 Homey.ManagerSettings.set('registered_athom', true);
				             self.log('Registered with Athom Cloud Webhook for Particle IO.');
				        })
				        .catch(
									function(err) {
										Homey.ManagerSettings.set('registered_athom', false);
										self.log('WARNING: Not registered with Athom Cloud Webhook for Particle IO.', err);
									}
								);
			},
			function(err) {
				self.error('Could not get HomeyID, cannot bond to Athom webhook service.')
			},
		);

		if (accessToken) {
			// We have a token, we should check it works
			this.log('PIoT has Token');

		} else {
			// We don't have a token. There isn't much we can do.
			this.log('PIoT does not have Token');

		}

	} // End of onInit


	webhookreceiver(args){
		// method to receive messages from webhook
		this.log('Got a webhook message!');
		this.log('headers:', args.headers);
		this.log('query:', args.query);
		this.log('body:', args.body);
		// Check if it's a test message
		/*
		if (args.body.coreid = 'api') {
			// Test message
			this.log('Got a Test from Particle API.');
			this.log('headers:', args.headers);
			this.log('query:', args.query);
			this.log('body:', args.body);
			// No need to do anything else right now.
			return;
		}
		*/
		// Could add other validity check. Will put them here
		// // TODO: Add These
		//
		// Route Reports
		// if coreid in devices list then send to device handler


	} // End of Webhook Receiver


	deauthorisehelper() {
		// avoid repetition
		Homey.ManagerSettings.set('authorised', false);
		Homey.ManagerApi.realtime('authorised', false);
		Homey.ManagerSettings.unset('accessToken');
		Homey.ManagerSettings.unset('accessTokenType');
		Homey.ManagerSettings.unset('accessTokenExpires');
		Homey.ManagerSettings.unset('refreshToken');
		Homey.ManagerSettings.unset('webhookUUID');
	}


	authorise(args) {
		// Gets an authorisation token through particle.login
		// Needs a username and password from front-end App settings.
		// returns a promise
		var particle = new Particle();
		var token;
		var self = this; // to get helper functions in Promises

		//this.log('PIoT app.authorise: Called.');
		var result = particle.login(args.query).then(
		  function(data) {
				token = data.body.access_token;
				Homey.ManagerSettings.set('accessToken', data.body.access_token);
				Homey.ManagerSettings.set('accessTokenType', data.body.token_type);
				var expirydate = moment().add(
					moment.duration(data.body.expires_in, 'seconds'));
				Homey.ManagerSettings.set('accessTokenExpires', expirydate);
				Homey.ManagerSettings.set('refreshToken', data.body.refresh_token);
				Homey.ManagerSettings.set('authorised', true);
				Homey.ManagerApi.realtime('authorised', true);
				//console.log('PIoT authorise: Login OK');
				return(data);
	  },
		  function (err) {
				self.deauthorisehelper();
		    //console.log('PIoT authorise: Could not log in.', err);
				return(err);
		  }
		);
		return result;
	} // End of authorise


	deauthorise() {
		// Remove auth token and set as not authorised
		// Returns a promise
		var particle = new Particle();
		var self = this; // to get helper functions in Promises
		if (Homey.ManagerSettings.get('authorised')) {
			// Get token
			var token = Homey.ManagerSettings.get('accessToken');
			var options = { auth: token };
			console.log('Deauthorising token: ', options)
			// Pass token to particle API, returns promise
			var result = particle.deleteCurrentAccessToken(options).then(
				function(result) {
					// Process data
					console.log('app.js:deauthorise:result', result);
					if (!result.error) {
						// Successfull deauthorise
						console.log('app.js:deauthorise Deauthorised');
						self.deauthorisehelper();
						return result;
					}
				},
				function(err) {
					// Deal with errors
					if (err.statusCode == 400) {
						// invalid_request, which has to mean token not recognised
						// so, deauthorise anyway
						console.log('app.js:deauthorise Bad Token');
						self.deauthorisehelper();
						return err;
					}
					console.log('app.js:deauthorise:err', err);
					return err;
				}
			)
			return result;
		} else {
			// Not authorised
			// need to return a promise failure
			console.log('app.js:deauthorise Not Authorised');
			return new Promise(function(resolve, reject) {
				reject({'error':'Not Authorised'});
			});
		}
	} // End of deauthorise

	integrate(){
		/*
		Method to integrate and validate Particle and Athom Clouds
		Uses webhooks
		{ id: '5afc86f05fbb0b7ec0f026c0',
		  event: 'Homey',
		  created_at: '2018-05-16T19:30:56.768Z',
		  url: 'https://webhooks.athom.com/webhook/5af6ce88e527d53223775c94/?id=etc',
		  requestType: 'POST',
		  json: true,
		  noDefaults: false,
		  rejectUnauthorized: true }

		Sorry - this code isn't pretty... I promise to improve.
		*/
		var particle = new Particle();
		var token = Homey.ManagerSettings.get('accessToken');
		var options = { auth: token };
		var myuuid = Homey.ManagerSettings.get('homeyCloudId');
		var athomintname = Homey.env.ATHOMINTNAME;
		var athomwhurl = Homey.env.ATHOMWHURL;
		var webhookuri = athomwhurl+webhookid+'/?id='+myuuid;
		// e.g. 'https://webhooks.athom.com/webhook/5af6ce88e527d53223775c94/?id=UNIQUEUSERID'
		// check if we have an existing Integration, and if the UUID is correct
		//var delete_integration = particle.deleteIntegration({ auth: token, integrationId: athomintname });
		var build_integration = {
				name: athomintname,
				url: webhookuri,
				requestType: 'POST',
				json: true,
				noDefaults: false,
				rejectUnauthorized: true,
				auth: token,
			};
		var check_integration = particle.listWebhooks(options
		).then(
			function(result) {
				console.log("List Integrations Result:", result);
				if(result.statusCode=='200') {
					// Loop through integration objects
					for (var key in result.body) {
						var obj = result.body[key];
						console.log(obj);
						if (obj.hasOwnProperty('event')) {
							if (obj.event=='Homey') {
										console.log('Homey Event Exists');
										// If Homey event exists return the object.
										return obj;
									}
								}
						}
						console.log("Homey Integration Does Not Exist");
						throw new Error("Homey Integration Does Not Exist");
					} else {
					console.log("Integration Check Unsuccesful");
					throw new Error("Integration Check Unsuccesful");
				}
			},
			function(err) {
				console.log("API listIntegrations Error:", err);
				throw new Error("Integration Check Unsuccesful", err);
			}
		).then(
			function(obj) {
				// We know Homey event exists, but is it correct?
				if (obj.event=='Homey' &&
						obj.requestType=='POST' && obj.json==true &&
					  obj.url==webhookuri) {
						console.log('Homey Integration Looks Correct');
						return obj;
					} else {
						// we need to delete the existing Integration and create a new one
						console.log('Trying to delete existing event');
						return particle.deleteWebhook({
							 auth: token,
							 hookId: obj.id }).then(
								 function(result) {
									 console.log('Deleted existing event: ', result);
									 return particle.createWebhook(build_integration);
								 },
								 function(err) {
									 console.log('Error deleting existing event', err);
									 throw Error("BAD Could not delete existing event.",err)
								 }
							 );
					}
			},
			function(err) {
				// If we're here the Homey event doesn't exist as an Integration
				// Create a new one
				console.log('Building new integration because', err);
				console.log(build_integration);
				return particle.createWebhook(build_integration);
			}
		).then(
			function(obj) {
				// We have a correct object. Yay.
			  console.log('Valid Integration', obj);
				return(obj);
			},
			function(err)  {
				// We failed to create an object
				console.log('Abject failure in check_integration', err);
				console.log('request was:',err.error.response.request);
				return(err);
			}
		)

		//
		return check_integration;
	}


} // End of Class ParticleIoT

module.exports = ParticleIoT;
