var config = {};

//config.manifest_file = '/tmp/opsworks-cli.stack.json';
config.data_dir = './data';
config.stack_manifest = config.data_dir + '/stack-manifest.json';

config.layerFile = function(StackId, LayerId){
	return config.data_dir+'/'+StackId+'/'+LayerId+'.json';
}

module.exports = config;