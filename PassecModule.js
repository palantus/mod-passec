var PassecModule = function () {
};

PassecModule.prototype.init = function(fw, onFinished) {
    this.fw = fw;
	onFinished.call(this);
}

PassecModule.prototype.onMessage = function (req, callback) {
	this.fw.modules["database"].run({table:"Passec", action: "custom", custom: req.body.message}, function(res){
		callback(res);
	});
};		
 
module.exports = PassecModule;