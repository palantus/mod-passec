function Passec(){
}

Passec.prototype.handleCustom = function(db, custom, callback){
	var t = this;
	switch(custom.action){
		case "GetBucket" :
			if(custom.bucketId != undefined && custom.bucketId != ""){
				db.query("SELECT Content FROM PassecPasswords AS P INNER JOIN PassecBuckets AS B ON P.BucketId = B.Id WHERE B.ClientId = ?", [custom.bucketId], function(res){
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

				var template = "INSERT INTO PassecPasswords(BucketId, Content) VALUES(@bucketId, ?); ";
				var sql = "\
								DECLARE @bucketClientId nvarchar(150) = ?;\
								DECLARE @bucketId INT = (SELECT Id FROM PassecBuckets WHERE ClientId = @bucketClientId); \
								IF (@bucketId IS NULL OR @bucketId <= 0) BEGIN\
									INSERT INTO PassecBuckets(ClientId) VALUES(@bucketClientId);\
									SET @bucketId = (SELECT Id FROM PassecBuckets WHERE ClientId = @bucketClientId);\
								END\
							";
				var args = [custom.bucketId];

				for(var i = 0; i < custom.passwords.length; i++){
					sql += template;
					args.push(custom.passwords[i]);
				}

				if(custom.passwords.length > 0){
					db.query(sql, args, function(res){
						callback({success:true});
					});
				} else {
					callback({success:true});
				}
			} else {
				callback({error: "Invalid bucket or passwords array"});
			}
			break;
	}
}
		
exports = module.exports = Passec;