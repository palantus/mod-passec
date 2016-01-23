var fs = require("fs");
var dbFile = "";
var sqlite = require("sqlite3").verbose();
var db = null;

var PassecModule = function () {
};

PassecModule.prototype.init = function(fw, onFinished) {
  this.fw = fw;
  dbFile = fw.config.data + "/passec.db";

  console.log("Passec: Trying to open database file: " + dbFile)

  db = new sqlite.Database(dbFile);

  db.serialize(function() {
    if(!fs.existsSync(dbFile)) {
      console.log("Passec: Creating tables in database...");
      db.run("\
          CREATE TABLE IF NOT EXISTS PassecBuckets(\
            Id INTEGER PRIMARY KEY AUTOINCREMENT,\
            ClientId nvarchar(150),\
            Title nvarchar(100),\
            UNIQUE (ClientId))")

      db.run("\
          CREATE TABLE PassecPasswords(\
            Id INTEGER PRIMARY KEY AUTOINCREMENT,\
            BucketId INTEGER,\
            Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\
            Content varchar(1000))")
    }
  });

	onFinished.call(this);
}

PassecModule.prototype.onMessage = function (req, callback) {
  this.handleCallback(req.body.message, function(res){
    callback(res);
  })
};

PassecModule.prototype.handleCallback = function(custom, callback){
	var t = this;

  switch(custom.action){
		case "GetBucket" :
			if(custom.bucketId != undefined && custom.bucketId != ""){
				db.all("SELECT Content FROM PassecPasswords AS P INNER JOIN PassecBuckets AS B ON P.BucketId = B.Id WHERE B.ClientId = ?", [custom.bucketId], function(err, res){
					var bucket = {id: custom.bucketId, title: "", passwords: []};
					for(i in res)
						bucket.passwords.push(res[i].Content);

					callback(bucket);
				});
			} else {
				callback({id: "", title: "", passwords: []});
			}
			break;
		case "SyncLocalChanges" :
			if(custom.bucketId != undefined && custom.bucketId != "" && custom.passwords !== undefined && Array.isArray(custom.passwords)){
        if(custom.passwords.length > 0){
          db.serialize(function() {
    				db.run("INSERT OR IGNORE INTO PassecBuckets(ClientId) VALUES(?)", custom.bucketId);

    				for(var i = 0; i < custom.passwords.length; i++){
              db.run("INSERT INTO PassecPasswords(BucketId, Content) VALUES((SELECT Id FROM PassecBuckets WHERE ClientId = ?), ?);", custom.bucketId, custom.passwords[i]);
    				}
          });

          callback({success:true});
				} else {
					callback({success:true});
				}
			} else {
				callback({error: "Invalid bucket or passwords array"});
			}
			break;
	}
}

module.exports = PassecModule;


/* MSSQL Version:
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
*/
