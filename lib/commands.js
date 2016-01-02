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

		if (_.isNaN(Number(layer.substr(layer.length - 1, 1)))) {
			console.log('Creating an SSH connection to first instance on %s::%s', config.get('stack'), layer);

		} else {
			console.log('Creating an SSH connection to hostname instance on %s::%s', config.get('stack'), layer);

		}

		Commands._getHostnames(layer).then(function(ip_address) {
			if (!_.isUndefined(ip_address)) {
				Commands._ssh(ip_address, options);
			} else {
				console.log('No Valid IP Address');
			}
		});

	},

	scp: function(layer, file, options) {

		var keyToUse = config.get('ssh:identity');
		var ssh_username = config.get('ssh:username');

		Commands._getHostnames(layer, true).then(function(ipAddresses) {
			_.forEach(ipAddresses, function(ipAddress) {

				var scpCommand = "scp -r " + " -i " + keyToUse + " " + file + " " + ssh_username + '@' + ipAddress + ":~";
				console.log(scpCommand);
				exec_sh(scpCommand);

			});
		});

	},

	ssh: function(layer, options) {
		if (typeof options.hostname != 'undefined') {}
		console.log('Creating an SSH connection to all instances on %s::%s', stack, layer);

		fetcher.getLayerId({
			StackName: config.get('stack'),
			LayerName: layer
		}, function(StackId, LayerId) {
			if (LayerId === null) {
				console.log('Layer ' + layer + ' not found');
				process.exit(1);
			}

			opsworks.describeInstances({
				LayerId: LayerId
			}, function(error, data) {
				if (error) {
					console.log(error);
				} else {
					var hosts = [];
					for (var i = 0; i < data.Instances.length; i++) {
						var instance = data.Instances[i];
						if (instance.Status == 'online') {

							// Are we only looking for one instance and is this the one?
							if (typeof options.hostname != 'undefined') {
								//console.log("Hostname is " + options.hostname);
								//console.log("Instance is " + instance.Hostname);
								if (instance.Hostname === options.hostname) {
									hosts.push(data.Instances[i].PublicIp);
									break;
								}
							} else {
								hosts.push(data.Instances[i].PublicIp);
							}
						}
					}

					//console.log("Reaching out to %s hosts", hosts.length);

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

					var sshCommand = __dirname + "/bin/ssh.sh -n " + layer + " -u " + ssh_username + sshOptionsString + " -i " + keyToUse + " " + hosts.join(" ");

					exec_sh(sshCommand);
				}
			});
		});
	},

	describe_deployments: function(deploymentId, options) {
		var stack = config.get('stack');

		fetcher.getStackId({
			StackName: stack
		}, function(StackId) {
			var _params = {
				StackId: StackId
			};
			opsworks.describeDeployments(_params, function(err, data) {
				if (err) console.log(err, err.stack); // an error occurred
				else console.log(data); // successful response
			});
		});
	},

	describe_deployment: function(deploymentId, options) {
		var stack = config.get('stack');

		fetcher.getStackId({
			StackName: stack
		}, function(StackId) {
			var _params = {
				StackId: StackId
			};
			opsworks.describeDeployments(_params, function(err, data) {
				if (err) console.log(err, err.stack); // an error occurred
				else console.log(data.Deployments[0]); // successful response
			});
		});
	},

	_getHostnames: function(layer, multiple) {

		var ipAddresses;

		if (_.isNaN(Number(layer.substr(layer.length - 1, 1)))) {


			ipAddresses = fetcher.getLayerId({
					StackName: config.get('stack'),
					LayerName: layer
				})
				.then(function(data) {
					return opsworks.describeInstancesAsync({
							LayerId: data[1]
						})
						.then(function(data) {
							return _.pluck(_.filter(data.Instances, {
								Status: 'online'
							}), 'PublicIp');
						});

				});

		} else {

			ipAddresses = fetcher.getStackId({
					StackName: config.get('stack'),
				})
				.then(function(data) {

					return opsworks.describeInstancesAsync({
							StackId: data
						})
						.then(function(data) {
							return [_.result(_.find(data.Instances, {
								Hostname: layer,
								Status: 'online'
							}), 'PublicIp')];
						});

				});
		}

		if (multiple) {
			return ipAddresses.then(function(data) {
				return data;
			});
		} else {
			return ipAddresses.then(function(data) {
				return data.shift();
			});
		}
	},

	update_cookbooks: function(options) {
		stack = config.get('stack');

		fetcher.getStackId({
			StackName: stack
		}, function(StackId) {
			var params = {
				Command: {
					Name: 'update_custom_cookbooks',
				},
				StackId: StackId,
			};
			opsworks.createDeployment(params, function(err, data) {
				if (err) console.log(err, err.stack); // an error occurred
				else console.log(data); // successful response
			});
		});
	},

	deploy: function(app, stack, layer, options) {
		stack = (stack) ? stack : config.get('stack');
		fetcher.getStackId({
			StackName: stack,

		}, function(StackId) {

			fetcher.getAppId({
				StackId: StackId,
				AppName: app
			}, function(appId) {
				var params = {
					Command: {
						Name: 'deploy',
					},
					StackId: StackId,
					AppId: appId
				};
				opsworks.createDeployment(params, function(err, data) {
					if (err) console.log(err, err.stack); // an error occurred
					else console.log(data); // successful response
				});
			});

		});
	},

	delete: function(stack, layer, options) {

		if (!options.allStopped && typeof options.prefix == 'undefined') {
			console.log('Need to pass a hostname prefix ');
		}

		fetcher.getLayerId({
			StackName: stack,
			LayerName: layer
		}, function(StackId, LayerId) {
			if (LayerId === null) {
				console.log('Layer ' + layer + ' not found');
				process.exit(1);
			}

			opsworks.describeInstances({
				LayerId: LayerId
			}, function(error, data) {
				if (error) {
					console.log(error);
				} else {
					var hosts = [];
					var deleteInstanceHandler = function(error, data) {
						if (error) {
							console.log('Failed to delete instance %s (%s)', instance.Hostname, instance.InstanceId);
							process.exit(1);
						}
					};
					for (var i = 0; i < data.Instances.length; i++) {
						var instance = data.Instances[i];

						if (instance.Status == "stopped" && (options.allStopped || instance.Hostname.indexOf(options.prefix) === 0)) {

							console.log("Deleting %s", instance.Hostname);

							opsworks.deleteInstance({
								InstanceId: instance.InstanceId
							}, deleteInstanceHandler);
						}
					}
				}
			});
		});
	},

	stop: function(stack, layer, options) {

		if (!options.all && typeof options.prefix == 'undefined') {
			console.log('Need to pass a hostname prefix ');
		}

		fetcher.getLayerId({
			StackName: stack,
			LayerName: layer
		}, function(StackId, LayerId) {
			if (LayerId === null) {
				console.log('Layer ' + layer + ' not found');
				process.exit(1);
			}

			opsworks.describeInstances({
				LayerId: LayerId
			}, function(error, data) {
				if (error) {
					console.log(error);
				} else {
					var hosts = [];
					var stopInstanceHandler = function(error, data) {
						if (error) {
							console.log('Failed to stop instance %s (%s)', instance.Hostname, instance.InstanceId);
							process.exit(1);
						}
					};
					for (var i = 0; i < data.Instances.length; i++) {
						var instance = data.Instances[i];
						if (options.all || instance.Hostname.indexOf(options.prefix) === 0) {

							console.log("Stopping %s", instance.Hostname);
							opsworks.stopInstance({
								InstanceId: instance.InstanceId
							}, stopInstanceHandler);
						}
					}
				}
			});
		});
	},

	add: function(stack, layer, options) {
		// Is the instance size valid?
		if (!util.validateInstanceType(options.size)) {
			console.log('%s is not a valid instance type.', options.size);
			process.exit(1);
		}

		if (typeof options.scalingType != 'undefined') {
			if (!util.validateAutoScalingType(options.scalingType)) {
				console.log('%s is not a valid scaling type', options.scalingType);
				process.exit(1);
			}
		}

		var startIn = function(count, zones, options) {
			fetcher.getLayerId({
				StackName: stack,
				LayerName: layer
			}, function(StackId, LayerId) {
				if (LayerId === null) {
					console.log('Layer ' + layer + ' not found');
					process.exit(1);
				}
				for (var i = 0; i < count; i++) {
					var AvailabilityZone = zones[i % zones.length];

					options.hostname = options.prefix + '-' + i;

					util.createInstance(StackId, LayerId, AvailabilityZone, options);
				}
			});
		};

		if (typeof options.availabilityZone != 'undefined') {
			util.validateAvailabilityZone(options.availabilityZone, function(valid) {
				if (!valid) {
					console.log('%s is not a valid availability zone', options.availabilityZone);
					process.exit(1);
				} else {
					// Create Instance
					console.log("Starting " + options.count + " in " + options.availabilityZone);
					startIn(options.count, [options.availabilityZone], options);
				}
			});
		} else if (options.distribute) {
			console.log("Starting " + options.count + " in distributed mode");

			fetcher.getAvailabilityZones(function(data) {
				var zones = [];
				for (var i = 0; i < data.AvailabilityZones.length; i++) {
					zones.push(data.AvailabilityZones[i].ZoneName);
				}

				startIn(options.count, zones, options);
			});
		} else {
			console.log('You must either use --distribute or assign an availability zone using --availability-zone');
			process.exit(1);
		}
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