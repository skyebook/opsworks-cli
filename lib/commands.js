"use strict";

let fs = require('q-io/fs');
var AWS = require('aws-sdk');
var Promise = require('bluebird');
let fetcher = Promise.promisifyAll(require('./fetcher'));

var config = require('./config');

class Commands{
	
	static addLayer(jsonFile){
		let _file = process.cwd()+'/'+jsonFile;
		
		let file = fs.exists(_file).then(function(result){
			if(result){
				return file;
			}
		});
		
		// let stackId = fetcher.
		fetcher.getStackId({
			StackName: config.get('stack')
		}, function(StackId) {
			console.log(StackId);
		});
	}
}


module.exports = Commands;