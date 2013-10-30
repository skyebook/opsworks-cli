var out = {};

out.instanceOverview = function(instance){
	console.log('%s\t%s\t%s\t%s\t%s', instance.InstanceId, instance.Hostname, instance.PublicIp, instance.AvailabilityZone, instance.Status);
};

module.exports = out;