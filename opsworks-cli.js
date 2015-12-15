// Third-Party Dependencies
var app = require('commander');

// Internal Dependencies
var config = require('./lib/config');
var commands = require('./lib/commands');

app
	.version(require('./package.json').version)
	.option('-s, --stack <stack>', 'The stack to use')
	.option('-v, --verbose', 'Show more details');


app.command('describe')
	.description('List the layers in a stack')
	.action(commands.describe);

app.command('list [layer]')
	.description('List the instances in a layer')
	.action(commands.list);

app.command('ssh [layer]')
	.description('Log into a single instance or an entire layer')
	.option('-i, --identity <identity>', 'The location of the key to use')
	.option('-h, --hostname [hostname]', 'The hostname of a single instance to log in to')
	.action(commands.ssh);

app.command('ssh2 [layer]')
	.description('Log into a single instance or an entire layer')
	.option('-i, --identity <identity>', 'The location of the key to use')
	.option('-h, --hostname [hostname]', 'The hostname of a single instance to log in to')
	.action(commands.ssh2);

app.command('scp [layer] [file]')
	.description('SCP to a server')
	.option('-i, --identity <identity>', 'The location of the key to use')
	.option('-h, --hostname [hostname]', 'The hostname of a single instance to log in to')
	.action(commands.scp);

app.command('config [key] [value]')
	.description('Update settings in the OpsWorks config file')
	.action(config.update);

app.command('add [stack] [layer]')
	.description('Add one or more instances to a layer')
	.option('--start', 'Starts the instance immediately.')
	.option('-h, --hostname [hostname]', 'Supply the hostname to be used for the instance.')
	.option('-p, --prefix [prefix]', 'Supply a prefix to be used for the instance hostname.', '')
	.option('-k, --keypair [keypair]', 'Specify which key pair to use when logging into the instance.')
	.option('-a, --ami [ami]', 'Specify a custom AMI to boot.')
	.option('-s,--size [size]', 'Specify the size of the EC2 instance.', 'c1.medium')
	.option('-c,--count [count]', 'Specify the number of EC2 instances to add', 1)
	// Scaling Type not yet supported
	//.option('--scaling-type [scaling-type]', 'Specify the scaling type of the instance (accepts \'timer\' or \'load\')')
	.option('--availability-zone [availability-zone]', 'Specify the availability zone if the distribute flag has not been used')
	.option('--distribute', 'Use this flag to automatically distribute nodes across all of the stack\'s availability zones')
	.action(commands.add);

app.command('stop [stack] [layer]')
	.description('Stops an instance either by using Stack/Layer/Hostname')
	.option('-p, --prefix [prefix]', 'Instances with a hostname starting with this prefix will be stopped')
	.option('--all', 'All instances in this layer will be stopped', '')
	.action(commands.stop);

app.command('delete [stack] [layer]')
	.description('Deletes stopped instances in a layer by hostname prefix or an \'all\' flag')
	.option('-p, --prefix [prefix]', 'Stopped instances with a hostname starting with this prefix will be deleted')
	.option('--all-stopped', 'All stopped instances in this layer will be deleted', '')
	.action(commands.delete);

app.command('start [stack] [layer] [hostname]')
	.description('Start an instance')
	.action(function(stack, layer, hostname, options) {
		console.log('NOT IMPLEMENTED:\tStarting %s::%s::%s', stack, layer, hostname);
	});

app.command('deploy [app] [stack] [layer]')
	.description('Deploy an application to a layer.')
	.action(commands.deploy);

app.command('undeploy [app] [stack] [layer]')
	.description('Undeploys an application from a layer')
	.action(function(app, stack, layer, options) {
		console.log('NOT IMPLEMENTED:\tUndeploying %s from %s::%s', app, stack, layer);
	});

app.command('update-cookbooks')
	.description('Updates the custom cookbooks within a stack')
	.action(commands.update_cookbooks);

app.command('describe-deployments [deploymentId]')
	.description('Updates the custom cookbooks within a stack')
	.action(commands.describe_deployments);

app.command('describe-deployment [deploymentId]')
	.description('Updates the custom cookbooks within a stack')
	.action(commands.describe_deployment);

app.command('exec-recipe [recipe] [stack] [layer]')
	.description('Executes a recipe on instances within a layer')
	.action(function(recipe, stack, layer, options) {
		console.log('NOT IMPLEMENTED:\tExecuting recipe %s on %s::%s', recipe, stack, layer);
	});

app.command('add-layer [jsonFile]')
	.description('Add a Layer to a stack based on a json file')
	.action(commands.addLayer);

app.command('add-app [jsonFile]')
	.description('Add an App to a stack based on a json file')
	.action(commands.addApp);

// Process the arguments (This needs to happen after all of the commands are declared)
app.parse(process.argv);