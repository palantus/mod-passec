var passwords = [];
var changes = [];
var changesFromServer = [];
var password = "";
var curBucket = "";
var lastLoadedEncryptedPasswords = [];

var filterType = "query"; //tag, query, "", notag, trash
var filterQuery = ""; //specific tag og query

var uniqueTags = {};
var delayTimer = null;

function init(){

	if(getUrlVar("b") != undefined){
		curBucket = getUrlVar("b");
	} else if(localStorage["FFAppBucket"]){
		curBucket = localStorage["FFAppBucket"];
	} else {
		window.location = "/passec/";
	}

	if(curBucket){
		$("#keyprompt").fadeIn();
		$("#bucketpassword").focus();

		$("#bucketpassword").keydown(function(e){
			if(e.which == 13 && $("#bucketpassword").val() != ""){
				$("#bucketpasswordok").click();
			}
		});

		$("#bucketpasswordok").click(function(){
			password = $("#bucketpassword").val();
			if(password){
				$("#keyprompt").hide();
				load();
				sync();
				refreshPasswords();
				$("#bucketpassword").val("");
				if(!isMobile())
					$("#searchbox").focus();
			} else {
				alert("Please enter a password");
			}
		});

		$("#bucketpasswordshowhidechars").click(function(){
			if($("#bucketpassword").attr("type") == "password"){
				$("#bucketpassword").attr("type", "text");
				$("#bucketpasswordshowhidechars").html("Hide input");
				$("#bucketpassword").focus();
				localStorage["showkeyinput"] = "true";
			} else {
				$("#bucketpassword").attr("type", "password");
				$("#bucketpasswordshowhidechars").html("Show input");
				$("#bucketpassword").focus();
				localStorage["showkeyinput"] = "false";
			}
		});

		if(window.navigator.mozApps){
			var request = window.navigator.mozApps.getSelf();
			request.onsuccess = function () {
				if(this.result){
					localStorage["FFAppBucket"] = curBucket;
				}
			};
		}
	} else {
		$("#bucketpasswordcontainer").hide();
		$("#helptext").fadeIn("fast");
		$("#passwordlist").hide();
	}

	if(localStorage["showkeyinput"] === "true")
		$("#bucketpasswordshowhidechars").click();

	setTimeout(function(){
		initFunctionality();
	}, 500);
}

function initFunctionality(){

	$(document).keydown(function(e){
		var focusElement = $(":focus");
		if(focusElement.length > 0 && (focusElement[0].nodeName == "TEXTAREA" || focusElement[0].nodeName == "INPUT"))
			return;

		if(e.ctrlKey || e.shiftKey || e.altKey)
			return;

		switch(e.which){
			case 65 : // a
			case 107 : // +
				$("#addpass:visible").click();
				break;
			case 83 : // s
				$("#dosync:visible").click();
				break;
			case 84 : // t
				$("#showtrash:visible").click();
				break;
			case 76 : // l
				$("#lockbucket:visible").click();
				break;
			case 79 : // o
				$("#openbucket:visible").click();
				break;
			case 49 : // 1
			case 50 : // 2
			case 51 : // 3
			case 52 : // 4
			case 53 : // 5
			case 54 : // 6
			case 55 : // 7
			case 56 : // 8
			case 57 : // 9
				$("#passwordlist tr:nth-child(" + (e.which - 48) + ")").click();
				break;
			case 97 : // 1
			case 98 : // 2
			case 99 : // 3
			case 100 : // 4
			case 101 : // 5
			case 102 : // 6
			case 103 : // 7
			case 104 : // 8
			case 105 : // 9
				$("#passwordlist tr:nth-child(" + (e.which - 96) + ")").click();
				break;
		}
	});

	$("#openbucket").click(function(){
		var bid = prompt("Enter a bucket ID or leave empty to generate a new random ID:");
		if (bid !== null && bid !== false) { // Canceled
			if(!bid)
				bid = guid();

			window.location = "?b=" + bid;
		}
		
	});

	$("#lockbucket").click(function(){
		location.reload();
	});

	$("#addpass").click(function(){
		var newId = guid();
		changes.push({id: newId, type: 1, orderIdx: 1, title: "New password", username: "", password: "", tags: ""});
		onChange();

		showPass(newId);
	})

	$("#showtrash").click(function(){
		$("#trashtable").toggle();
		$("#showtrash").html($("#trashtable:visible").length > 0 ? "Hide Trash" : "Show Trash");
	});
	
	$("#dosync").click(function(){
		sync();
	});

	$("#curpassword_close").click(function(){
		closeCurrentPassword();
	})

	$("#curpassword_random").click(function(){
		var curPass = $("#curpassword_password").val();
		if(curPass && !confirm("Are you sure that you want to overwrite the current password with a new random one?"))
			return;

		$("#curpassword_password").val(generatePassword());
	})


	$("#curpassword_trash").click(function(){
		var pass = $("#passwordshow").data("pass");
		if(pass && pass.id && confirm("Are you sure that you want to trash the current password?")){
			changes.push({id: pass.id, type: -1, orderIdx: pass.orderIdx + 1});
			onChange();
			
			closeCurrentPassword();
		}
	});

	$("#curpassword_save").click(function(){
		var pass = $("#passwordshow").data("pass");

		var newTitle = $("#curpassword_title").val();
		var newUsername = $("#curpassword_username").val();
		var newPassword = $("#curpassword_password").val();
		var newTags = $("#curpassword_tags").val();

		if(pass.username && pass.username != newUsername && !confirm("Are you sure that you want to change this username?"))
			return;

		if(pass.password && pass.password != newPassword && !confirm("Are you sure that you want to change this password?"))
			return;

		if(newTitle != pass.title || newUsername != pass.username || newPassword != pass.password || newTags != pass.tags){
			pass.title = newTitle;
			pass.username = newUsername;
			pass.password = newPassword;
			pass.tags = newTags;

			changes.push({id: pass.id, type: 0, orderIdx: pass.orderIdx + 1, title: pass.title, username: pass.username, password: pass.password, tags: pass.tags});
			onChange();
		}

		closeCurrentPassword();

	})
	
	$(document).keydown(function(e) {
		if (e.keyCode == 27) { //ESC
			$("div.popup").fadeOut("fast");
		}
	});

	$("#taglist .tag").click(function(){ // Standard "tags"
		var t = $(this);
		$("#searchbox").val("");
		if(t.data("type") == "all"){
			filterType = "query";
			filterQuery = "";
			$("#titletext").html("All passwords");
		} else if(t.data("type") == "notag"){
			filterType = "notag";
			filterQuery = "";
			$("#titletext").html("Passwords without a tag");
		} else if(t.data("type") == "trash"){
			filterType = "trash";
			filterQuery = "";
			$("#titletext").html("Trash");
		} else {
			return;
		}
		refreshPasswords();
	})

	$("#searchbox")[0].oninput = function () {
		clearTimeout(delayTimer);
		delayTimer = setTimeout(function() {
			filterType = "query"
			filterQuery = $("#searchbox").val();
			refreshPasswords();
		}, isMobileOrNarrow() ? 200 : 0);
	};

	$("#maintitle").click(function(){
		window.location = "/passec";
	})
}

function onChange(){
	save();
	load();
	refreshPasswords();
	sync();
}

function closeCurrentPassword(){
	$("#passwordshow").fadeOut("fast");
	$("#passwordshow").data("pass", "");
}

function save(){
	if(changes.length <= 0 && changesFromServer.length <= 0)
		return;
	
	var encryptedPasswords = [];
	for(i in changes){
		changes[i].changeId = guid();
		var passStr = JSON.stringify(changes[i]);
		var encrypted = CryptoJS.AES.encrypt(passStr, password).toString();
		encryptedPasswords.push(encrypted);
	}

	for(i in changesFromServer){
		var passStr = JSON.stringify(changesFromServer[i]);
		var encrypted = CryptoJS.AES.encrypt(passStr, password).toString();
		encryptedPasswords.push(encrypted);
	}
	changesFromServer = [];

	if(typeof(Storage)!=="undefined"){
		var cachedBuckets = localStorage.passwords;
	} else {
		var cachedBuckets = $.cookie("passwords");
	}
	
	var found = false;
	var cachedData = [];
	if(cachedBuckets){
		cachedData = JSON.parse(cachedBuckets);
		for(i in cachedData){
			if(cachedData[i].bucketId == curBucket){
				for(c in encryptedPasswords)
					cachedData[i].data.push(encryptedPasswords[c]);
				found = true;
			}
		}
	}
	
	if(!found)
		cachedData.push({bucketId: curBucket, data: encryptedPasswords});
	
	if(typeof(Storage)!=="undefined"){
		localStorage.passwords = JSON.stringify(cachedData);
	} else {
		$.cookie("passwords", JSON.stringify(cachedData));
	}
	
	changes = [];
}

function load(){	
	if(typeof(Storage)!=="undefined"){
		passwords = localStorage.passwords;
	} else {
		passwords = $.cookie("passwords");
	}
	
	
	if(!passwords){
		passwords = [];
	} else if(typeof(passwords) === "string") {
	
		var cachedData = JSON.parse(passwords);
		var bucketData;
		for(i in cachedData)
			if(cachedData[i].bucketId == curBucket)
				bucketData = cachedData[i].data;
	
		lastLoadedEncryptedPasswords = [];

		if(!bucketData){
			passwords = [];
			return;
		}
	
		passwords = [];
		for(i in bucketData){
			try{
				var decrypted = CryptoJS.AES.decrypt(bucketData[i], password);
				decrypted = decrypted.toString(CryptoJS.enc.Utf8);
				if(decrypted.substring(0, 1) == "{"){
					var pass = JSON.parse(decrypted)
					passwords.push(pass);
					lastLoadedEncryptedPasswords.push(bucketData[i]);

				}
			} catch (err){

			}
		}
	}
}

function sync(){
	request({module: "passec", message: {action: "GetBucket", bucketId: curBucket}}, function(bucket){
		$("#offline").hide();

		var localKnownIds = [];
		var serverKnownIds = [];
		for(p in passwords){
			localKnownIds.push(passwords[p].changeId);
		}

		changesFromServer = [];
		for(var i = 0; i < bucket.passwords.length; i++){
			try{
				var decrypted = CryptoJS.AES.decrypt(bucket.passwords[i], password);
				decrypted = decrypted.toString(CryptoJS.enc.Utf8);
				if(decrypted.substring(0, 1) == "{"){
					var p = JSON.parse(decrypted);
					serverKnownIds.push(p.changeId);
					if(localKnownIds.indexOf(p.changeId) < 0)
						changesFromServer.push(p)
				}
			} catch(err){

			}
		}
		
		if(changesFromServer.length > 0){
			save();
			load();
			refreshPasswords();
		}

		var passwordsToSync = [];
		for(i in localKnownIds){
			if(serverKnownIds.indexOf(localKnownIds[i]) < 0){
				var changeId = localKnownIds[i];
				var pass = null;
				for(var p = passwords.length -1; p >= 0; p--){
					if(passwords[p].changeId == changeId){
						pass = passwords[p];
						break;
					}
				}

				if(pass!= null){
					var passStr = JSON.stringify(pass);
					var encrypted = CryptoJS.AES.encrypt(passStr, password).toString();
					passwordsToSync.push(encrypted);
				}
			}
		}

		if(passwordsToSync.length > 0){
			request({module: "passec", message: {action: "SyncLocalChanges", bucketId: curBucket, passwords: passwordsToSync}}, function(res){
				$("#offline").hide();
			}, function(){$("#offline").show();});
		}
	}, function(){$("#offline").show();});
}

function refreshPasswords(){
	
	if(passwords === undefined)
		return;

	var visiblePasswords = [];
	var addedPasswordIds = [];
	var removedPasswordIds = [];

	var trashPasswords = [];
	var trashPasswordIds = [];

	var sortedPasswords = passwords.sort(function(a, b){return a.orderIdx > b.orderIdx ? 1 : -1;});

	for(var i = sortedPasswords.length - 1; i >= 0; i--){
		if((sortedPasswords[i].type == 1 || sortedPasswords[i].type == 0) && addedPasswordIds.indexOf(sortedPasswords[i].id) < 0 && removedPasswordIds.indexOf(sortedPasswords[i].id) < 0){
			visiblePasswords.push(sortedPasswords[i]);
			addedPasswordIds.push(sortedPasswords[i].id);
		} else if(sortedPasswords[i].type == -1 && removedPasswordIds.indexOf(sortedPasswords[i].id) < 0 && addedPasswordIds.indexOf(sortedPasswords[i].id) < 0){
			removedPasswordIds.push(sortedPasswords[i].id);
			addedPasswordIds.push(sortedPasswords[i].id);
		}

		if(sortedPasswords[i].type != -1 && removedPasswordIds.indexOf(sortedPasswords[i].id) >= 0 && trashPasswordIds.indexOf(sortedPasswords[i].id) < 0){
			trashPasswords.push(sortedPasswords[i]);
			trashPasswordIds.push(sortedPasswords[i].id);
			addedPasswordIds.push(sortedPasswords[i].id);
		}
	}


	/* refresh custom tags */
	uniqueTags = {};
	for(var i in visiblePasswords){
		if(typeof(visiblePasswords[i].tags) === "string" && visiblePasswords[i].tags != ""){
			var tags = visiblePasswords[i].tags.split(",");
			for(var t in tags)
				uniqueTags[tags[t]] = true;
		}
	}

	$("#customtags").empty();
	var tags = [];
	for(var t in uniqueTags)
		tags[tags.length] = t;
	tags = tags.sort(function(a, b){return a > b ? 1 : -1;});
	for(var t in tags)
		$("#customtags").append($("<div/>", {class: "tag", html: tags[t]}));

	$("#customtags .tag").click(function(){
		var t = $(this);
		filterType = "tag";
		filterQuery = t.html();
		$("#searchbox").val("");
		refreshPasswords();
	})
	
	/* Refresh visible passwords */
	tab = $("#passwordlist tbody");
	tab.empty();

	var visiblePasswords = filterPasswords(visiblePasswords);
	visiblePasswords = visiblePasswords.sort(function(a, b){return (a.title && b.title && a.title.toLowerCase() > b.title.toLowerCase()) ? 1 : -1;});
	for(i in visiblePasswords){
		var tr = $("<tr/>");
		var td = $("<td/>");
		td.html(visiblePasswords[i].title);
		tr.data("pass", visiblePasswords[i]);
		
		
		tr.click(function(){
			var pass = $(this).data("pass");
			showPass(pass.id, true);
		});
		
		tr.append(td);

		tr.append($("<td/>", {html: visiblePasswords[i].username}));
		tr.append($("<td/>", {html: visiblePasswords[i].tags}));


		tab.append(tr);
	}
	
	tab = $("#trashtable tbody");
	tab.empty();
	var trashPasswords = trashPasswords.sort(function(a, b){return a.title > b.title ? 1 : -1;});
	for(i in trashPasswords){
		var tr = $("<tr/>");
		var td = $("<td/>");
		td.html(trashPasswords[i].title);
		tr.data("pass", trashPasswords[i]);
		
		
		tr.click(function(){
			var pass = $(this).data("pass");
			changes.push({id: pass.id, type: 1, orderIdx: pass.orderIdx + 1, title: pass.title, username: pass.username, password: pass.password});
			onChange();
		});
		
		tr.append(td);
		tab.append(tr);
	}

	if($("#passwordlist:visible").length < 1)
		$("#passwordlist").fadeIn("fast");
}

function filterPasswords(passwords){
	var res = [];

	if(filterType == "query" && !filterQuery){
		$("#titletext").html("All passwords");
		return passwords;
	}

	if(filterType == "tag" && filterQuery)
		$("#titletext").html("Passwords with tag '" + filterQuery + "'");

	if(filterType == "query" && filterQuery)
		$("#titletext").html("Passwords containing '" + filterQuery + "'");

	for(i in passwords){
		var add = false;
		var pass = passwords[i];

		if(filterType == "tag" && pass.tags !== undefined){
			var tags = pass.tags.split(",");
			for(var t in tags){
				if(filterType == "tag" && tags[t] == filterQuery
					|| filterType == "query" && tags[t].indexOf(filterQuery) >= 0){
					add = true;
				}

			}
		}

		if(filterType == "notag" && !pass.tags)
			add = true;

		/*
		if(filterType == "trash" && !pass.tags)
			add = true;
		*/

		if(filterType == "query"){
			if(!add && pass.title && pass.title.toLowerCase().indexOf(filterQuery.toLowerCase()) >= 0)
				add = true;
			if(!add && pass.username && pass.username.toLowerCase().indexOf(filterQuery.toLowerCase()) >= 0)
				add = true;
			if(!add && pass.tags && pass.tags.toLowerCase().indexOf(filterQuery.toLowerCase()) >= 0)
				add = true;
		}

		if(add)
			res[res.length] = pass;
	}

	return res;
}

function showPass(id, preventFocus){

	var pass = null;
	for(var i = passwords.length - 1; i >= 0; i--){
		if(passwords[i].id == id){
			if(passwords[i].type != -1){
				pass = passwords[i];
				break;
			}
		}
	}
	
	if(!pass)
		return;

	$("#passwordshow").data("pass", pass);
	$("#passwordshow").fadeIn("fast");

	$("#curpassword_title").val(pass.title);
	$("#curpassword_username").val(pass.username);
	$("#curpassword_password").val(pass.password);
	$("#curpassword_tags").val(pass.tags);

	if(preventFocus !== true)
		$("#curpassword_title").focus();

	$("#curpassword_save").removeAttr("disabled")
	$("#curpassword_trash").removeAttr("disabled")
}

function isMobileOrNarrow(){
	return isMobile() || $(window).innerWidth() < 450;
}

function generatePassword() {
    var length = 12,
        charset = "abcdefghijklnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}
