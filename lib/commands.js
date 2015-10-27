var fs = require('q-io/fs');
var AWS = require('aws-sdk');
var P2 = require('bluebird');
var _ = require('lodash');
var exec_sh = require('exec-sh');



var fetcher = require('./fetcher');
var out = require('./out');
var config = require('./config');

var opsworks = new AWS.OpsWorks();
P2.promisifyAll(Object.getPrototypeOf(opsworks));

var Commands = {

	self: this,

	describe: function(options) {

		fetcher.getStackId({
			StackName: config.get('stack')
		}).then(function(stackId) {
			return opsworks.describeLayersAsync({
				StackId: stackId
			});
		}).then(function(data) {
			console.log(stack);

			data.Layers.forEach(function(layer, index, layers) {
				out.layerOverview(layer);
			});
		});
	},

	addLayer: function(jsonFile) {
		var _file = process.cwd() + '/' + jsonFile;
		var file = fs.exists(_file).then(function(result) {
			if (result) {
				return _file;
			}
		}).then(function(file) {
			return fs.read(file).then(JSON.parse);
		});

		var stackID = fetcher.getStackId({
			StackName: config.get('stack')
		}).then(function(StackId) {
			return StackId;
		});

		Promise.all([file, stackID]).then(function(args) {
			var layerConfig = args[0];
			layerConfig.StackId = args[1];

			return opsworks.createLayerAsync(layerConfig).then(logger).catch(logger);
		});
	},

	addApp: function(jsonFile) {
		var _file = process.cwd() + '/' + jsonFile;
		var file = fs.exists(_file).then(function(result) {
			if (result) {
				return _file;
			}
		}).then(function(file) {
			return fs.read(file).then(JSON.parse);
		});

		var stackID = fetcher.getStackId({
			StackName: config.get('stack')
		}).then(function(StackId) {
			return StackId;
		});

		Promise.all([file, stackID]).then(function(args) {
			var layerConfig = args[0];
			layerConfig.StackId = args[1];

			return opsworks.createAppAsync(layerConfig).then(logger).catch(logger);
		});
	},

	list: function(layer, options) {

		var prItemID = (_.isUndefined(layer)) ?
			fetcher.getStackId({
				StackName: config.get('stack')
			}) :
			fetcher.getLayerId({
				StackName: config.get('stack'),
				LayerName: layer
			});

		prItemID.then(function(data) {

			var params = {};
			if (_.isArray(data)) {
				params.LayerId = data[1];
			} else {
				params.StackId = data;
			}

			opsworks.describeInstancesAsync(params)
				.then(function(data) {

					if (options.parent.verbose) {
						console.log(data.Instances[0]);
					}

					data.Instances.forEach(function(instance, index, instances) {
						out.instanceOverview(instance);
					});
				});

		});
	},

	ssh2: function(layer, options) {

		var ipAddress;

		if (_.isNaN(Number(layer.substr(layer.length - 1, 1)))) {

			console.log('Creating an SSH connection to first instance on %s::%s', config.get('stack'), layer);

			ipAddress = fetcher.getLayerId({
					StackName: config.get('stack'),
					LayerName: layer
				})
				.then(function(data) {

					return opsworks.describeInstancesAsync({
							LayerId: data[1]
						})
						.then(function(data) {
							return _.result(_.find(data.Instances, {
								Status: 'online'
							}), 'PublicIp');
						});

				});

		} else {
			console.log('Creating an SSH connection to hostname instance on %s::%s', config.get('stack'), layer);

			ipAddress = fetcher.getStackId({
					StackName: config.get('stack'),
				})
				.then(function(data) {

					return opsworks.describeInstancesAsync({
							StackId: data
						})
						.then(function(data) {
							return _.result(_.find(data.Instances, {
								Hostname: layer,
								Status: 'online'
							}), 'PublicIp');
						});

				});
		}

		ipAddress.then(function(ip_address) {
			if (!_.isUndefined(ip_address)) {
				Commands._ssh(ip_address, options);
			} else {
				console.log('No Valid IP Address');
			}
		});

	},

	_ssh: function(hostname, options) {
		// Start the options string with a space so it doesn't collide with the preceding argument
		var sshOptionsString = " ";
		var sshOpts = config.get('ssh:options');
		if (sshOpts !== undefined) {
			for (var key in sshOpts) {
				if (sshOpts.hasOwnProperty(key)) {
					sshOptionsString += "-o " + key + "=" + sshOpts[key];
				}
			}
		}

		var ssh_username = config.get('ssh:username');

		// Get the default key from the config file
		var keyToUse = config.get('ssh:identity');
		// Override the default if supplied as a command-line argument
		if (typeof options.identity != 'undefined') {
			keyToUse = options.identity;
		}

		var sshCommand = "ssh " + sshOptionsString + " -i " + keyToUse + " " + ssh_username + '@' + hostname;
		console.log(sshCommand);
		exec_sh(sshCommand);
	}
};

function logger(e) {
	console.log(e);
}


module.exports = Commands;