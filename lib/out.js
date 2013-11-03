var out = {};

out.instanceOverview = function(instance){
	console.log('%s\t%s\t%s\t%s\t%s\t%s', instance.InstanceId, instance.Hostname, instance.AvailabilityZone, instance.Status, instance.PublicIp, instance.PublicDns);
};

module.exports = out;