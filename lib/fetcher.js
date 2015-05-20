var fetcher = {};

var AWS = require('aws-sdk');
var _ = require('lodash');

//===============================================
// Begin Configuration
//===============================================

var AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
var AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (typeof AWS_ACCESS_KEY_ID == 'undefined' || typeof AWS_SECRET_ACCESS_KEY == 'undefined') {
	console.log("AWS credentials must be set");
	process.exit(1);
}

var awsOptions = {
	"accessKeyId": AWS_ACCESS_KEY_ID,
	"secretAccessKey": AWS_SECRET_ACCESS_KEY,
	"region": "us-east-1"
};
AWS.config.update(awsOptions);

fetcher.AWS = AWS;

var opsworks = new AWS.OpsWorks();
var ec2 = new AWS.EC2();

//===============================================
// End Configuration
//===============================================

fetcher.getStackId = function(params, callback) {
	opsworks.describeStacks(function(error, data) {
		if (error) {
			console.log(error);
		} else {
			for (var i = 0; i < data.Stacks.length; i++) {
				var stack = data.Stacks[i];
				if (stack.Name === params.StackName) {
					callback(stack.StackId);
					return;
				}
			}

			callback(null);
		}
	});
};

fetcher.getLayerId = function(params, callback) {
	if (typeof params.StackId != 'undefined' && typeof params.LayerName != 'undefined') {
		opsworks.describeLayers({
			StackId: params.StackId
		}, function(error, data) {
			if (error) {
				console.log(error);
			} else {
				for (var i = 0; i < data.Layers.length; i++) {
					var layer = data.Layers[i];
					if (layer.Shortname === params.LayerName) {
						callback(params.StackId, layer.LayerId);
						return;
					}
				}

				callback(null);
			}
		});
	} else if (typeof params.StackName != 'undefined') {
		fetcher.getStackId({
			StackName: params.StackName
		}, function(StackId) {
			if (StackId == null) {
				console.log('Stack ' + params.StackName + ' not found');
				process.exit(1);
			}

			fetcher.getLayerId({
				StackId: StackId,
				LayerName: params.LayerName
			}, callback);
		});
	}
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
			if (LayerId == null) {
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
}

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
}

module.exports = fetcher;