var config = require('nconf');
var fs = require('fs');

var USER_CONFIG_FILE = process.env.HOME + '/.opsworks_cli_config.json';

config
	.env()
	.argv()
	.file({
		file: USER_CONFIG_FILE
	})
	.defaults({
		'stack': config.get('default_stack')
	});
var profile = (config.get('stacks:' + config.get('stack') + ':profile')) ? config.get('stacks:' + config.get('stack') + ':profile') : 'default';

config.set('profile', profile);
config.update = function(key, value, options) {

	if (key === undefined || value === undefined) {
		console.log('A key and value must be defined');
		console.log(config.get());
		process.exit(1);
	}

	key = key.replace('.', ':');
	config.set(key, value);

	config.save(function(err) {
		fs.readFile(USER_CONFIG_FILE, function(err, data) {
			console.dir(JSON.parse(data.toString()));
		});
		if (err) {
			console.log('Config file could not be saved');
			console.log(err.message);
		} else {
			console.log('Config file updated');
		}
	});
};

module.exports = config;