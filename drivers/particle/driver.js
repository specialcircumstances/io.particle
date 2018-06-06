'use strict';

const Homey = require('homey');
const Particle = require('particle-api-js');


// Helper functions

function getParticleDevices() {
	var accessToken = Homey.ManagerSettings.get('accessToken');
	var particle = new Particle();
	var self=this;

}


class ParticleDriver extends Homey.Driver {

	onInit() {
		this.log('ParticleDriver has been inited');
	}

	// this is the easiest method to overwrite, when only the
	// template 'Drivers-Pairing-System-Views' is being used.
  onPairListDevices( data, callback ) {
		// Setup a few bits
		var accessToken = Homey.ManagerSettings.get('accessToken');
		var particle = new Particle();
		var self=this;
		var devicesout = []

		// Ask  Particle Cloud for a list of devices (returns a Promise)
		/* { body: [ { id: '410025000847343232363230',
       name: 'homey_dev',
       last_app: null,
       last_ip_address: '86.145.169.186',
       last_heard: '2018-06-06T18:20:33.465Z',
       product_id: 6,
       connected: true,
       platform_id: 6,
       cellular: false,
       notes: null,
       status: 'normal',
       current_build_target: '0.7.0',
       system_firmware_version: '0.7.0',
       default_build_target: '0.7.0' }, { etc } ] }
		*/
		var devicesPr = particle.listDevices({ auth: accessToken });
		devicesPr.then(
		  function(devices){
		    //self.log('Devices: ', devices);
				devices.body.forEach((device) => {
					// Returns a list of online and nominal particle devices.
					// Check other things on actual pairing?
					if (device.connected == true && device.status == 'normal') {
						devicesout.push({
							'name' : device.name,
							'data' : { 'id' : device.id }
						});
					}
				});
				callback( null, devicesout );
		  },
		  function(err) {
		    self.log('List devices call failed: ', err);
				callback( err, null);
		  }
		);


		// Get detailed info on the devices
		/*
		{ body:
		   { id: '410025000847343232363230',
		     name: 'homey_dev',
		     last_app: null,
		     last_ip_address: '86.145.169.186',
		     last_heard: '2018-06-06T19:19:53.164Z',
		     product_id: 6,
		     connected: true,
		     platform_id: 6,
		     cellular: false,
		     notes: null,
		     status: 'normal',
		     serial_number: 'PH-150623-WXHH-0',
		     current_build_target: '0.7.0',
		     system_firmware_version: '0.7.0',
		     default_build_target: '0.7.0',
		     variables:
		      { HomeyAPI: 'int32',
		        HomeyClass: 'string',
		        HomeyCaps: 'string',
		        HomeyConfs: 'string',
		        HomeyActs: 'string' },
		     functions: [ 'HomeyGet', 'HomeySet', 'HomeyAct' ],
		     cc3000_patch_version: 'wl0: Nov  7 2014 16:03:45 version 5.90.230.12 FWID 01-d1e74914' },
		  statusCode: 200 }
		*/
		/*
		devicesPr = particle.getDevice({ deviceId: '410025000847343232363230', auth: accessToken });
		devicesPr.then(
		  function(data){
		    console.log('Device attrs retrieved successfully:', data);
		  },
		  function(err) {
		    console.log('API call failed: ', err);
		  }
		);
		*/
		// The objects in the pair Array are called views.
		// They will be shown in the pairing wizard in the same order as defined.
		// It is possible to programmatically navigate between them by
		// calling Homey.showView( String viewId )

		/*
    let devices = [
          {
              // Required properties:
              "name": "My Device",
              "data": { "id": "abcd" },

              // Optional properties, these overwrite those specified in app.json:
              // "icon": "/path/to/another/icon.svg",
              // "capabilities": [ "onoff", "dim" ],
              // "capabilitiesOptions: { "onoff": {} },
              // "mobile": {},

              // Optional properties, device-specific:
              // "store": { "foo": "bar" },
              // "settings": {},

          }
      ];
			*/
      //callback( null, devices );

  }	 // End of PairListDevices

}  // End of ParticleDriver

module.exports = ParticleDriver;
