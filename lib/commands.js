var fs = require('q-io/fs');
var AWS = require('aws-sdk');
var P2 = require('bluebird');
var _ = require('lodash');


var fetcher = require('./fetcher');
var out = require('./out');
var config = require('./config');

var opsworks = new AWS.OpsWorks();
P2.promisifyAll(Object.getPrototypeOf(opsworks));

var Commands = {

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
					data.Instances.forEach(function(instance, index, instances) {
						out.instanceOverview(instance);
					});
				});

		});
	}
};

function logger(e) {
	console.log(e);
}


module.exports = Commands;