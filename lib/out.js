// Common printing of OpsWorks assets

var out = {};

out.instanceOverview = function(instance){
	console.log('%s\t%s\t%s\t%s\t%s\t%s\t%s', instance.InstanceId, instance.Hostname, instance.AvailabilityZone, instance.Status, instance.PublicIp, instance.PrivateIp, instance.PublicDns);
};

out.layerOverview = function(layer){
	console.log('%s\t%s\t%s\t%s', layer.LayerId, layer.Type, layer.Shortname, layer.Name);
};

module.exports = out;