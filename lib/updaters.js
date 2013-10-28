var updaters = {};

var fs = require('fs');

updaters.updateLayersCallback = function(error, data){
	if(error){
		console.log(error);
	}
	else{
		data.Layers.forEach(function(layer, index, layers){
			console.log('Got Layer ' + layer.LayerId + ' ('+layer.Shortname+')');
		});
	}
};

module.exports = updaters;