"use strict";

let fs = require('q-io/fs');
var AWS = require('aws-sdk');
var P2 = require('bluebird');

let fetcher = require('./fetcher');
var out = require('./out');
var config = require('./config');

var opsworks = new AWS.OpsWorks();
P2.promisifyAll(Object.getPrototypeOf(opsworks));

class Commands {

	static describe(options) {

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
	}
	
	static addLayer(jsonFile) {
		let _file = process.cwd() + '/' + jsonFile;
		let file = fs.exists(_file).then(function(result) {
			if (result) {
				return _file;
			}
		}).then(function(file) {
			return fs.read(file).then(JSON.parse);
		});

		let stackID = fetcher.getStackId({
			StackName: config.get('stack')
		}).then(function(StackId) {
			return StackId;
		});

		Promise.all([file, stackID]).then(function(args) {
			let layerConfig = args[0];
			layerConfig.StackId = args[1];

			return opsworks.createLayerAsync(layerConfig).then(logger).catch(logger);
		});
	}

	static addApp(jsonFile) {
		let _file = process.cwd() + '/' + jsonFile;
		let file = fs.exists(_file).then(function(result) {
			if (result) {
				return _file;
			}
		}).then(function(file) {
			return fs.read(file).then(JSON.parse);
		});

		let stackID = fetcher.getStackId({
			StackName: config.get('stack')
		}).then(function(StackId) {
			return StackId;
		});

		Promise.all([file, stackID]).then(function(args) {
			let layerConfig = args[0];
			layerConfig.StackId = args[1];

			return opsworks.createAppAsync(layerConfig).then(logger).catch(logger);
		});
	}
}

function logger(e) {
	console.log(e);
}


module.exports = Commands;