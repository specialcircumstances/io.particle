'use strict';

const Homey = require('homey');

class ParticleDevice extends Homey.Device {

	onInit() {
		this.log('ParticleDevice has been inited');
	}

}

module.exports = ParticleDevice;
