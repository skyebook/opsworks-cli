// Third-Party Dependencies
var app = require('commander');
var AWS = require('aws-sdk');
var fs = require('fs');
var spawn = require('child_process').spawn;

// Internal Dependencies
var config = require('./config');
var out = require('./lib/out');
var util = require('./lib/util')
var fetcher = require('./lib/fetcher');

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
		
	fetcher.getLayerId({StackName:stack, LayerName:layer}, function(StackId, LayerId){
		if(LayerId==null){
			console.log('Layer ' + layer + ' not found');
			process.exit(1);
		}
			
		opsworks.describeInstances({LayerId:LayerId}, function(error, data){
			if(error){
				console.log(error);
			}
			else{
				data.Instances.forEach(function(instance, index, instances){
					out.instanceOverview(instance);
				});
			}
		});
	});
});

app.command('ssh [stack] [layer] [hostname]')
.description('Log into in an instance')
.option('-i, --identity <identity>', 'The location of the key to use')
.action(function(stack, layer, hostname, options){
	console.log('Creating an SSH connection to %s::%s::%s', stack, layer, hostname);
	
	fetcher.getInstance({StackName:stack, LayerName:layer, Hostname:hostname}, function(instance){
		if(instance==null){
			console.log('Instance %s could not be found', hostname);
			process.exit(1);
		}
		
		//console.log(instance);
		if(options.identity){
			//var command = 'ssh -i '+options.i +' ubuntu@'+instance.PublicIp;
			//console.log('Running `%s`', command);
			var args = [
			'-tt',
			'-i' + options.identity,
			'ubuntu@'+instance.PublicIp
			];
			var ssh = spawn('ssh', args);
			
			ssh.on('exit', process.exit);

			ssh.stdout.pipe(process.stdout);
			ssh.stderr.pipe(process.stderr);

			process.stdin.pipe(ssh.stdin);
			//process.stdin.resume();
			
			ssh.on('error', function(error){
				console.log(error);
			});
		}
		else{
			console.log("No identity provided");
		}
	});
});

app.command('add [stack] [layer] [availability_zone]')
.description('Add an instance to a layer')
.option('--start', 'Starts the instance immediately.')
.option('-h, --hostname [hostname]', 'Supply the hostname to be used for the instance.')
.option('-k, --keypair [keypair]', 'Specify which key pair to use when logging into the instance.')
.option('-a, --ami [ami]', 'Specify a custom AMI to boot.')
.option('-s,--size [size]', 'Specify the size of the EC2 instance.', 'c1.medium')
.option('--scaling-type [scaling-type]', 'Specify the scaling type of the instance (accepts \'timer\' or \'load\')')
.action(function(stack, layer, availability_zone, options){	
	// Is the instance size valid?
	if(!util.validateInstanceType(options.size)){
		console.log('%s is not a valid instance type.', options.size);
		process.exit(1);
	}
	
	if(typeof options.scalingType != 'undefined'){
		if(!util.validateAutoScalingType(options.scalingType)){
			console.log('%s is not a valid scaling type', options.scalingType);
			process.exit(1);
		}
	}
	
	util.validateAvailabilityZone(availability_zone, function(valid){
		if(!valid){
			console.log('%s is not a valid availability zone', availability_zone);
			process.exit(1);
		}
		else{
			// Get the Stack and the Layer ID's
			fetcher.getLayerId({StackName:stack, LayerName:layer}, function(StackId, LayerId){
				if(LayerId==null){
					console.log('Layer ' + layer + ' not found');
					process.exit(1);
				}
		
				var params = {
					StackId:StackId,
					LayerIds:[LayerId],
					InstanceType:options.size,
					AvailabilityZone:availability_zone
				};
				
				if(typeof options.scalingType != 'undefined'){
					params.AutoScalingType = options.scalingType;
				}
		
				if(typeof options.keypair != 'undefined'){
					params.SshKeyName=options.keypair;
				}
		
				if(typeof options.ami != 'undefined'){
					params.AmiId=options.ami;
				}
				
				if(typeof options.hostname != 'undefined'){
					params.Hostname=options.hostname;
				}
				
				opsworks.createInstance(params, function(error, data){
					if(error){
						console.log(error);
						process.exit(1);
					}
					else{
						console.log('Instance %s Created', data.InstanceId);
						if(options.start){
							console.log("want to start instance now");
							opsworks.startInstance({InstanceId:data.InstanceId}, function(error, data){
								if(error){
									console.log(error);
									process.exit(1);
								}
								
								console.log("Instance starting");
							});
						}
					}
				});
			});
		}
	});
});

app.command('stop')
.description('Stops an instance either by using Stack/Layer/Hostname, or directly via instance ID')
.option('--stack [stack]', 'The stack containing the instance to stop. Must be used in conjunction with the layer and hostname options.')
.option('--layer [layer]', 'The layer containing the instance to stop. Must be used in conjunction with the stack and hostname options.')
.option('--hostname [hostname]', 'The hostname of the instance to stop. Must be used in conjunction with the stack and layer options.')
.option('--id [id]', 'The UUID of the instance to stop')
.option('--delete', 'Deletes the instance immediately. Be careful.')
.action(function(options){
	
	var deleteInstance = function(InstanceId){
		opsworks.deleteInstance({InstanceId:InstanceId}, function(error, data){
			if(error){
				console.log(error);
				process.exit(1);
			}
			
			console.log('Instance Deleted');
		});
	};
	
	var stop = function(InstanceId){
		console.log('Stopping %s, this may take a while..', InstanceId);
		opsworks.stopInstance({InstanceId:InstanceId}, function(error, data){
			if(error){
				console.log('Failed to stop instance %s (%s)', hostname, instance.InstanceId);
				process.exit(1);
			}
			
			console.log('Stopped %s', InstanceId);
				
			if(options.delete){
				console.log("Intent to delete");
				deleteInstance(InstanceId);
			}
		});
	};
	
	if(typeof options.id != 'undefined'){
		if(!util.validateUUID(options.id)){
			console.log('%s is not a valid instance ID', options.id);
			process.exit(1);
		}
		
		stop(options.id);
	}
	else if(typeof options.stack != 'undefined' && typeof options.layer != 'undefined' && typeof options.hostname != 'undefined'){
		fetcher.getInstance({StackName:stack, LayerName:layer, Hostname:hostname}, function(instance){
			if(instance==null){
				console.log('Instance %s could not be found', hostname);
				process.exit(1);
			}
		
			stop(instance.InstanceId);
		});
	}
	else{
		console.log('Either an instance ID or (stack & layer & hostname) are required.');
	}
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
