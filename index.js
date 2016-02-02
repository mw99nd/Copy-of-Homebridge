var smartthings = require('./lib/smartthingsapi');

var Service, Characteristic, Accessory, uuid;

var SmartThingsAccessory;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.hap.Accessory;
	uuid = homebridge.hap.uuid;

	SmartThingsAccessory = require('./accessories/smartthings')(Accessory, Service, Characteristic, uuid);

	homebridge.registerPlatform("homebridge-smartthings", "SmartThings", SmartThingsPlatform);
};

function SmartThingsPlatform(log, config) {
	// Load Wink Authentication From Config File
	this.app_url = config["app_url"];
	this.app_id = config["app_id"];
	this.access_token = config["access_token"];

	this.api = smartthings;
	this.log = log;
	this.deviceLookup = {};
}

SmartThingsPlatform.prototype = {
	reloadData: function (callback) {
		//This is called when we need to refresh all Wink device information.
		//this.log("Refreshing Sensibo Data");
		for (var i = 0; i < this.deviceLookup.length; i++) {
			this.deviceLookup[i].loadData();
		}
	},
	accessories: function (callback) {
		this.log("Fetching Smart Things devices.");
		
		var that = this;
		var foundAccessories = [];
		this.deviceLookup = [];
		this.unknownCapabilities = [];
		this.knownCapabilities = ["Switch","Color Control","Battery","Polling","Lock","Refresh","Lock Codes","Sensor","Actuator",
									"Configuration","Switch Level","Temperature Measurement","Motion Sensor","Color Temperature",
									"Contact Sensor","Three Axis","Acceleration Sensor","Momentary","Door Control","Garage Door Control"];
		var refreshLoop = function () {
			setInterval(that.reloadData.bind(that), 30000);
		};
		smartthings.init(this.app_url, this.app_id, this.access_token);
		smartthings.getDevices(function (devices) {
				// success
				for (var i = 0; i < devices.length; i++) {
					var device = devices[i];
					
					var accessory = undefined;
					accessory = new SmartThingsAccessory(that, device);

					if (accessory != undefined) {
						if ((accessory.services.length<=1)||(accessory.deviceGroup=="unknown")) {
							that.log("Device Skipped - Group " + accessory.deviceGroup + ", Name " + accessory.name+ ", ID " + accessory.deviceid+", JSON: "+ JSON.stringify(device));
						} else {
							that.log("Device Added - Group " + accessory.deviceGroup + ", Name " + accessory.name + ", ID " + accessory.deviceid+", JSON: "+ JSON.stringify(device));
							that.deviceLookup.push(accessory);
							foundAccessories.push(accessory);
						}
					}
				}
				refreshLoop();
				that.log("Unknown Capabilities: " + JSON.stringify(that.unknownCapabilities));
				callback(foundAccessories);
		});
	}
};