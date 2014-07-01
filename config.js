var fs = require('fs');

var settingsPath = __dirname+"/config.json";

var config = {};

config.settings = {};

config.load = function(){
	var settingsData = fs.readFileSync(settingsPath);
	
	try{
		config.settings = JSON.parse(settingsData);
	}
	catch(e){
		console.log('Config file could not be loaded');
		console.log(e);
	}
}

config.write = function(){
	fs.writeFile(settingsPath, config.settings, function(err){
		if(err){
			console.log('Config file could not be saved');
			console.log(err.message);
		}
		else{
			console.log('Config file updated');
		}
	});
}

module.exports = config;