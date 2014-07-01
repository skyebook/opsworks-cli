// Third-Party Dependencies
var app = require('commander');
var AWS = require('aws-sdk');
var exec_sh = require('exec-sh');

// Node Stuff
var fs = require('fs');

// Internal Dependencies
var config = require('./config.json');
var out = require('./lib/out');
var util = require('./lib/util')
var fetcher = require('./lib/fetcher');

var AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
var AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if(AWS_ACCESS_KEY_ID === undefined || AWS_SECRET_ACCESS_KEY === undefined){
	console.log("AWS credentials must be set");
	process.exit(1);
}

var awsOptions = { "accessKeyId": AWS_ACCESS_KEY_ID, "secretAccessKey": AWS_SECRET_ACCESS_KEY, "region": "us-east-1" };
AWS.config.update(awsOptions);

var opsworks = new AWS.OpsWorks();

app.version(require('./package.json').version);

app.command('describe [stack]')
.description('List the layers in a stack')
.action(function(stack, options){
		
	fetcher.getStackId({StackName:stack}, function(StackId){
			
		opsworks.describeLayers({StackId:StackId}, function(error, data){
			if(error){
				console.log(error);
			}
			else{
				data.Layers.forEach(function(layer, index, layers){
					out.layerOverview(layer);
				});
			}
		});
	});
});

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

app.command('ssh [stack] [layer]')
.description('Log into a single instance or an entire layer')
.option('-i, --identity <identity>', 'The location of the key to use')
.option('-h, --hostname [hostname]', 'The hostname of a single instance to log in to')
.action(function(stack, layer, options){
	if(typeof options.hostname != 'undefined'){
	}
	console.log('Creating an SSH connection to all instances on %s::%s', stack, layer);
	
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
				var hosts = new Array();
				for(var i=0; i<data.Instances.length; i++){
					var instance = data.Instances[i];
					if(instance.Status=='online'){
						
						// Are we only looking for one instance and is this the one?
						if(typeof options.hostname != 'undefined'){
							//console.log("Hostname is " + options.hostname);
							//console.log("Instance is " + instance.Hostname);
							if(instance.Hostname === options.hostname){
								hosts.push(data.Instances[i].PublicIp);
								break;
							}
						}
						else{
							hosts.push(data.Instances[i].PublicIp);
						}
					}
				}
			
				//console.log("Reaching out to %s hosts", hosts.length);
				
				// Start the options string with a space so it doesn't collide with the preceding argument
				var sshOptionsString = " ";
				var sshOpts = config.ssh.options;
				if(sshOpts !== undefined){
					for(var key in sshOpts){
						if(sshOpts.hasOwnProperty(key)){
							sshOptionsString += "-o "+key+"="+sshOpts[key];
						}
					}
				}
				
				// Get the default key from the config file
				var keyToUse = config.ssh.identity;
				// Override the default if supplied as a command-line argument
				if(typeof options.identity != 'undefined'){
					keyToUse = options.identity;
				}
				
				var sshCommand = __dirname+"/bin/ssh.sh -n " + layer + " -u ubuntu" + sshOptionsString + " -i " + keyToUse + " " + hosts.join(" ");
				
				exec_sh(sshCommand);
			}
		});
	});
});

app.command('config [key] [value]')
.description('Update settings in the OpsWorks config file')
.action(function(key, value, options){
	
	if(key === undefined || value === undefined){
		console.log('A key and value must be defined');
		process.exit(1);
	}
	
	var keyPaths = key.split(".");
	
	var walk = function(currentPath, next, valueToSet){
		if(typeof currentPath[next] == 'undefined'){
			currentPath[next] = {};
		}
		
		if(arguments.length==3){
			currentPath[next] = valueToSet;
		}
		
		return currentPath[next];
	};
	
	var currentlyAt = config;
	keyPaths.forEach(function(element, index, array){
		console.log('Descending to ' + element);
		if(index==array.length-1){
			currentlyAt = walk(currentlyAt, element, value);
		}
		else{
			currentlyAt = walk(currentlyAt, element);
		}
	});
	
	//config[key] = value;
	
	fs.writeFile(__dirname+'/config.json', JSON.stringify(config, null, '\t'), function(err){
		if(err){
			console.log('Config file could not be saved');
			console.log(err.message);
		}
		else{
			console.log('Config file updated');
		}
	});
});

app.command('add [stack] [layer]')
.description('Add one or more instances to a layer')
.option('--start', 'Starts the instance immediately.')
.option('-h, --hostname [hostname]', 'Supply the hostname to be used for the instance.')
.option('-p, --prefix [prefix]', 'Supply a prefix to be used for the instance hostname.', '')
.option('-k, --keypair [keypair]', 'Specify which key pair to use when logging into the instance.')
.option('-a, --ami [ami]', 'Specify a custom AMI to boot.')
.option('-s,--size [size]', 'Specify the size of the EC2 instance.', 'c1.medium')
.option('-c,--count [count]', 'Specify the number of EC2 instances to add', 1)
.option('--scaling-type [scaling-type]', 'Specify the scaling type of the instance (accepts \'timer\' or \'load\')')
.option('--availability-zone [availability-zone]', 'Specify the availability zone if the distribute flag has not been used')
.option('--distribute', 'Use this flag to automatically distribute nodes across all of the stack\'s availability zones')
.action(function(stack, layer, options){	
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
	
	var startIn = function(count, zones, options){
		fetcher.getLayerId({StackName:stack, LayerName:layer}, function(StackId, LayerId){
			if(LayerId==null){
				console.log('Layer ' + layer + ' not found');
				process.exit(1);
			}
			for(var i=0; i < count; i++){
				var AvailabilityZone = zones[i%zones.length];
				
				options.hostname = options.prefix+'-'+i;
				
				util.createInstance(StackId, LayerId, AvailabilityZone, options);
			}
		});
	};
	
	if(typeof options.availabilityZone != 'undefined'){
		util.validateAvailabilityZone(options.availabilityZone, function(valid){
			if(!valid){
				console.log('%s is not a valid availability zone', options.availabilityZone);
				process.exit(1);
			}
			else{
				// Create Instance
				console.log("Starting " + options.count + " in " + options.availabilityZone);
				startIn(options.count, [options.availabilityZone], options);
			}
		});
	}
	else if(options.distribute){
		console.log("Starting " + options.count + " in distributed mode");
		
		fetcher.getAvailabilityZones(function(data){
			var zones = new Array();
			for(var i=0; i<data.AvailabilityZones.length; i++){
				zones.push(data.AvailabilityZones[i].ZoneName);
			}
			
			startIn(options.count, zones, options);
		});
	}
	else{
		console.log('You must either use --distribute or assign an availability zone using --availability-zone');
		process.exit(1);
	}
});

app.command('stop [stack] [layer]')
.description('Stops an instance either by using Stack/Layer/Hostname')
.option('-p, --prefix [prefix]', 'Instances with a hostname starting with this prefix will be stopped')
.option('--all', 'All instances in this layer will be stopped', '')
.action(function(stack, layer, options){
	
	if(!options.all && typeof options.prefix == 'undefined'){
		console.log('Need to pass a hostname prefix ');
	}
	
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
				var hosts = new Array();
				for(var i=0; i<data.Instances.length; i++){
					var instance = data.Instances[i];
					if(options.all || instance.Hostname.indexOf(options.prefix)===0){
						
						console.log("Stopping %s", instance.Hostname);
						opsworks.stopInstance({InstanceId:instance.InstanceId}, function(error, data){
							if(error){
								console.log('Failed to stop instance %s (%s)', instance.Hostname, instance.InstanceId);
								process.exit(1);
							}
						});
					}
				}
			}
		});
	});
});

app.command('delete [stack] [layer]')
.description('Deletes stopped instances in a layer by hostname prefix or an \'all\' flag')
.option('-p, --prefix [prefix]', 'Stopped instances with a hostname starting with this prefix will be deleted')
.option('--all-stopped', 'All stopped instances in this layer will be deleted', '')
.action(function(stack, layer, options){
	
	if(!options.allStopped && typeof options.prefix == 'undefined'){
		console.log('Need to pass a hostname prefix ');
	}
	
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
				var hosts = new Array();
				for(var i=0; i<data.Instances.length; i++){
					var instance = data.Instances[i];
					
					if(instance.Status=="stopped" && (options.allStopped || instance.Hostname.indexOf(options.prefix)===0)){
						
						console.log("Deleting %s", instance.Hostname);
						
						opsworks.deleteInstance({InstanceId:instance.InstanceId}, function(error, data){
							if(error){
								console.log('Failed to delete instance %s (%s)', instance.Hostname, instance.InstanceId);
								process.exit(1);
							}
						});
					}
				}
			}
		});
	});
});

app.command('start [stack] [layer] [hostname]')
.description('Start an instance')
.action(function(stack, layer, hostname, options){
	console.log('NOT IMPLEMENTED:\tStarting %s::%s::%s', stack, layer, hostname);
});

app.command('deploy [app] [stack] [layer]')
.description('Deploy an application to a layer.')
.action(function(app, stack, layer, options){
	console.log('NOT IMPLEMENTED:\tDeploying %s on %s::%s', app, stack, layer);
});

app.command('undeploy [app] [stack] [layer]')
.description('Undeploys an application from a layer')
.action(function(app, stack, layer, options){
	console.log('NOT IMPLEMENTED:\tUndeploying %s from %s::%s', app, stack, layer);
});

app.command('update-cookbooks [stack] [layer]')
.description('Updates the custom cookbooks within a layer')
.action(function(stack, layer, options){
	console.log('NOT IMPLEMENTED:\tUpdating custom cookbooks in %s::%s', stack, layer);
});

app.command('exec-recipe [recipe] [stack] [layer]')
.description('Executes a recipe on instances within a layer')
.action(function(recipe, stack, layer, options){
	console.log('NOT IMPLEMENTED:\tExecuting recipe %s on %s::%s', recipe, stack, layer);
});

// Process the arguments (This needs to happen after all of the commands are declared)
app.parse(process.argv);
