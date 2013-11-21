var util = {};
var fetcher = require('./fetcher');

util.validateAutoScalingType = function(type){
	return type == 'timer' || type == 'load';
};

util.validateInstanceType = function(type){
	// CC2, CR1, CG1, HI1, and HS1 (any cluster instance) types are unsupported
	
	return type == 't1.micro' || type == 'm1.small' || type == 'm1.medium' || type == 'm1.large' || type == 'm1.xlarge' || type == 'm3.xlarge' || type == 'm3.2xlarge' ||
	type == 'c3.large' || type == 'c3.xlarge' || type == 'c3.2xlarge' || type == 'c3.4xlarge' || type == 'c3.8xlarge' ||
	type == 'c1.medium' || type == 'c1.xlarge' || type == 'm2.xlarge' || type == 'm2.2xlarge' || type == 'm2.4xlarge';
};

util.validateAvailabilityZone = function(availabilityZone, callback){
	
	fetcher.getAvailabilityZones(function(data){
		for(var i=0; i<data.AvailabilityZones.length; i++){
			var az = data.AvailabilityZones[i];
			if(az.ZoneName == availabilityZone){
				callback(true);
				return;
			}
		}
		
		callback(false);
	});
};

util.validateUUID = function(uuid){
	var rgx = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
	return rgx.test(uuid);
};

util.createInstance = function(StackId, LayerId, AvailabilityZone, options){
	var params = {
		StackId:StackId,
		LayerIds:[LayerId],
		InstanceType:options.size,
		AvailabilityZone:AvailabilityZone
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
	
	var opsworks = new fetcher.AWS.OpsWorks();
		
	opsworks.createInstance(params, function(error, data){
		if(error){
			console.log(error);
			process.exit(1);
		}
		else{
			//console.log('Instance %s Created', data.InstanceId);
			if(options.start){
				console.log("want to start instance now");
				opsworks.startInstance({InstanceId:data.InstanceId}, function(error, data){
					if(error){
						console.log(error);
						process.exit(1);
					}
						
					console.log("Instance %s starting", data.InstanceId);
				});
			}
		}
	});
}

module.exports = util;