var chai = require('chai');

var fetcher = require('../lib/fetcher');

var test_data = {
	StackId: '<a StackId',
	StackName: '<a StackName',
	LayerName: '<a layer Shortname>'
};

//save the actual details in test_data.js for safety
var test_data = require('../test_data');

describe("Fetcher ", function() {
	describe("getStackId", function() {
		stackId = "";
		it("returns a promise", function() {
			rtn = fetcher.getStackId({
				StackName: test_data.StackName
			});
			chai.expect(rtn).to.be.a('Object');
			chai.expect(rtn.then).to.be.a('Function');
		});
		it("contains a string", function(done) {
			rtn = fetcher.getStackId({
				StackName: test_data.StackName
			});
			rtn.then(function(a) {
				stackId = a;
				chai.expect(a).to.be.a('String');
				chai.expect(a).to.have.length(36);
				done();
			});
		});
		it("allows a callback", function(done) {
			rtn = fetcher.getStackId({
				StackName: test_data.StackName
			}, function(a) {
				chai.expect(a).to.be.a('String');
				chai.expect(a).to.equal(stackId);
				done();
			});
		});
	});
	
	
	describe("getLayerId", function() {
		layerId = "";
		this.timeout(5000);
		it("returns a promise", function() {
			rtn = fetcher.getLayerId({
				StackName: test_data.StackName,
				LayerName: test_data.LayerName
				
			});
			chai.expect(rtn.then).to.be.a('Function');
		});
		it("works with known StackId", function(done) {
			rtn = fetcher.getLayerId({
				StackId: test_data.StackId,
				LayerName: test_data.LayerName
				
			});
			rtn.then(function(a) {
				chai.expect(a[0]).to.be.a('String');
				chai.expect(a[1]).to.be.a('String');
				chai.expect(a[0]).to.have.length(36);
				chai.expect(a[1]).to.have.length(36);
				done();
			});
		});
		it("contains an array of 2 strings", function(done) {
			rtn = fetcher.getLayerId({
				StackName: test_data.StackName,
				LayerName: test_data.LayerName
				
			});
			rtn.then(function(a) {
				chai.expect(a[0]).to.be.a('String');
				chai.expect(a[1]).to.be.a('String');
				chai.expect(a[0]).to.have.length(36);
				chai.expect(a[1]).to.have.length(36);
				done();
			});
		});
		it("allows a callback", function(done) {
			fetcher.getLayerId({
				StackName: test_data.StackName,
				LayerName: test_data.LayerName
			}, function(a, b) {
				chai.expect(a).to.be.a('String');
				chai.expect(b).to.be.a('String');
				chai.expect(a).to.have.length(36);
				chai.expect(b).to.have.length(36);
				
				// chai.expect(b).to.equal(layerId);
				done();
			});
		});
	});
});