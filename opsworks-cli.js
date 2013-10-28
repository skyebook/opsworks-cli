// Load the configuration
var app = require('commander');
var AWS = require('aws-sdk');
var config = require('./config');
var fs = require('fs');

var AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
var AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if(typeof AWS_ACCESS_KEY_ID == 'undefined' || typeof AWS_SECRET_ACCESS_KEY == 'undefined'){
	console.log("AWS credentials must be set");
	process.exit(1);
}

var awsOptions = { "accessKeyId": AWS_ACCESS_KEY_ID, "secretAccessKey": AWS_SECRET_ACCESS_KEY, "region": "us-east-1" };
AWS.config.update(awsOptions);

var opsworks = new AWS.OpsWorks();

app.version('0.0.1');

app.command('list [stack] [layer]')
.description('List the instances in a layer')
.action(function(stack, layer, options){
	console.log("listing %s::%s", stack, layer);
	opsworks.describeInstances({StackId:stack, LayerId:layer}, function(error, data){
		if(error){
			console.log(error);
		}
		else{
			console.log(data);
		}
	});
});

app.command('ssh [stack] [layer] [hostname]')
.description('Log into in an instance')
.action(function(stack, layer, hostname, options){
	console.log('Creating an SSH connection to %s::%s::%s', stack, layer, hostname);
});

app.command('add [stack] [layer] [size] [availability_zone]')
.description('Add an instance to a layer')
.option('-s, --start', 'Starts the instance immediately.')
.option('-h, --hostname [hostname]', 'Supply the hostname to be used for the instance.')
.option('-k, --keypair [keypair]', 'Specify which key pair to use when logging into the instance.')
.option('-a, --ami [ami]', 'Specify a custom AMI to boot.')
.action(function(stack, layer, size, availability_zone, options){
	console.log('Adding %s instance to %s::%s in %s', size, stack, layer, availability_zone);
});

app.command('stop [stack] [layer] [hostname]')
.description('Stop an instance')
.option('--delete', 'Deletes the instance immediately. Be careful.')
.action(function(stack, layer, hostname, options){
	console.log('Stopping%s%s::%s::%s', options.delete?' and deleting immediately ':' ' , stack, layer, hostname);
});

app.command('start [stack] [layer] [hostname]')
.description('Start an instance')
.action(function(stack, layer, hostname, options){
	console.log('Starting %s::%s::%s', stack, layer, hostname);
});

app.command('deploy [app] [stack] [layer]')
.description('Deploy an application to a layer.')
.action(function(app, stack, layer, options){
	console.log('Deploying %s on %s::%s', app, stack, layer);
});

app.command('undeploy [app] [stack] [layer]')
.description('Undeploys an application from a layer')
.action(function(app, stack, layer, options){
	console.log('Undeploying %s from %s::%s', app, stack, layer);
});

app.command('update-cookbooks [stack] [layer]')
.description('Updates the custom cookbooks within a layer')
.action(function(stack, layer, options){
	console.log('Updating custom cookbooks in %s::%s', stack, layer);
});

app.command('exec-recipe [recipe] [stack] [layer]')
.description('Executes a recipe on instances within a layer')
.action(function(recipe, stack, layer, options){
	console.log('Executing recipe %s on %s::%s', recipe, stack, layer);
});

// Process the arguments (This needs to happen after all of the commands are declared)
app.parse(process.argv);