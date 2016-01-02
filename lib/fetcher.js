var fetcher = {};

var AWS = require('aws-sdk');
var _ = require('lodash');
var P2 = require('bluebird');


var config = require('./config');


//===============================================
// Begin Configuration
//===============================================

var awsOptions = {
	"region": config.get('aws:region')
};
AWS.config.update(awsOptions);

// console.log(AWS.config.credentials);

var opsworks = new AWS.OpsWorks();
var ec2 = new AWS.EC2();

P2.promisifyAll(Object.getPrototypeOf(opsworks));
P2.promisifyAll(Object.getPrototypeOf(ec2));


//===============================================
// End Configuration
//===============================================

fetcher.getStack = function(params){
	return opsworks.describeStacksAsync().then(function(data){
		return _.find(data.Stacks, {'Name': params.StackName});
	});
};

fetcher.getStackId = function(params, callback) {
	
	return opsworks.describeStacksAsync().then(function(data){
		return _.result(_.find(data.Stacks, {'Name': params.StackName}), 'StackId');
	}).then(function(StackId){
		if(callback){
			callback(StackId);
		}
		return StackId;
	}).catch(function(e){
		console.log(e);
		if(callback){
			callback(null);
		}
	});
};

fetcher.getLayerId = function(params, callback) {
	
	var prStackID = (typeof params.StackId != 'undefined')? Promise.resolve(params.StackId) : fetcher.getStackId({StackName: params.StackName});
	
	var prLayerID = prStackID.then(function(stackId){
		return opsworks.describeLayersAsync({StackId: stackId}).then(function(data){
			return _.result(_.find(data.Layers, {'Shortname': params.LayerName}), 'LayerId');
		});
	});
	
	return Promise.all([prStackID, prLayerID]).then(function(rtn){
		if(callback){
			callback(rtn[0], rtn[1]);
		}
		return rtn;
	}).catch(function(e){
		if(callback){
			callback(null);
		}
		
		console.log(e);
	});
};

fetcher.getInstance = function(params, callback) {
	if (typeof params.LayerId != 'undefined' && params.Hostname) {
		opsworks.describeInstances({
			LayerId: params.LayerId
		}, function(error, data) {
			if (error) {
				console.log(error);
			} else {
				for (var i = 0; i < data.Instances.length; i++) {
					var instance = data.Instances[i];
					if (instance.Hostname === params.Hostname) {
						callback(instance);
						return;
					}
				}

				callback(null);
			}
		});
	} else if (typeof params.StackName != 'undefined' && typeof params.LayerName != 'undefined') {
		fetcher.getLayerId(params, function(LayerId) {
			if (LayerId === null) {
				console.log('Layer ' + params.LayerName + ' not found');
				process.exit(1);
			}

			fetcher.getInstance({
				LayerId: LayerId,
				Hostname: params.Hostname
			}, callback);
		});
	}
};

fetcher.getAvailabilityZones = function(callback) {
	ec2.describeAvailabilityZones({}, function(error, data) {
		if (error) {
			console.log(error);
			process.exit(1);
		} else {
			callback(data);
		}
	});
};

fetcher.getAppId = function(params, callback) {
	if (typeof params.StackId != 'undefined' && typeof params.AppName != 'undefined') {
		var _params = {
			StackId: params.StackId
		};
		opsworks.describeApps(_params, function(err, data) {
			if (err) console.log(err, err.stack); // an error occurred
			callback(_.pluck(_.filter(data.Apps, {'Name': params.AppName}), 'AppId')[0]);
		});
	}
};

module.exports = fetcher;