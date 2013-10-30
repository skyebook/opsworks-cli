var util = {};
var fetcher = require('./fetcher');

util.validateAutoScalingType = function(type){
	return type == 'timer' || type == 'load';
};

util.validateInstanceType = function(type){
	// CC2, CR1, CG1, HI1, and HS1 (any cluster instance) types are unsupported
	
	return type == 't1.micro' || type == 'm1.small' || type == 'm1.medium' || type == 'm1.large' || type == 'm1.xlarge' || type == 'm3.xlarge' || type == 'm3.2xlarge' ||
	type == 'c1.medium' || type == 'c1.xlarge' || type == 'm2.xlarge' || type == 'm2.2xlarge' || type == 'm2.4xlarge';
};

util.validateAvailabilityZone = function(availabilityZone, callback){
	var ec2 = new fetcher.AWS.EC2();
	
	ec2.describeAvailabilityZones({}, function(error, data){
		if(error){
			console.log(error);
			process.exit(1);
		}
		else{
			for(var i=0; i<data.AvailabilityZones.length; i++){
				var az = data.AvailabilityZones[i];
				if(az.ZoneName == availabilityZone){
					callback(true);
					return;
				}
			}
			
			callback(false);
		}
	});
	
	return availabilityZone == '';
};

util.validateUUID = function(uuid){
	//return uuid.match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/');
	//return uuid.match("/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$");
	var rgx = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
	return rgx.test(uuid);
};

module.exports = util;