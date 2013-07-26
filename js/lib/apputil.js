// rewrite backbone.localStorage-1.0


_.extend(Backbone.Model.prototype, {
	fetch2: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
	  var offlineStorage = null;
	  try{offlineStorage = model.offlineStorage(); }catch(err){}
	  
      options.success = function(resp, status, xhr) {
        if (!model.set(model.parse(resp), options)) return false;
        if (success) {
			if((offlineStorage == false) || (offlineStorage == null)){ // overwrite
			} else {
				try{
					function errorCB(err) {
						//alert("Error processing SQL: "+err.code+"\n"+err.message);
					}
					offlineStorage.content = xhr.responseText;
					//console.log(offlineStorage);
					window.writeFile(offlineStorage);
					if(offlineStorage.folder == "map"){
						function populateDB(tx) {
							tx.executeSql('REPLACE INTO MAP (id, mapKey, name, description, language, lastUpdate, logDate) VALUES (?,?,?,?,?,?,?)', 
										[model.get("id"), model.get("mapKey"), model.get("name") ,model.get("description"), model.get("language"), model.get("lastUpdate"), new Date()]);
						}
						appFunc.db.transaction(populateDB, errorCB);
					}
				}catch(err2){}
			}
			success(model, resp, options);
		}
      };
      return this.sync('read', this, options);
    },
	fetchOffline : function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
	  
	  var offlineStorage = null;
	  try{offlineStorage = model.offlineStorage(); }catch(err){}
	  
	  if((offlineStorage == false) || (offlineStorage == null)){
		  return this.fetch(options);
	  } else {
		  $.extend(options, offlineStorage);
		  options.success = function(resp, file) {
			if (!model.set(model.parse(resp), options)) return false;
			//alert("fetch success: "+offlineStorage.folder);
			if (success) success(model, resp, options);
		  };
		  window.readFile(options);
		  return this;
	  }
	  
    },
	destroyOffline: function(options){
	  options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
	  var error = options.error;
	  
	  var offlineStorage = null;
	  try{offlineStorage = model.offlineStorage(); }catch(err){}
	  
	  if((offlineStorage == false) || (offlineStorage == null)){
		  return this;
	  } else {
		  try{
			  function errorCB(err) {
				  //alert("Error processing SQL: "+err.code+"\n"+err.message);
			  }
			  $.extend(options, offlineStorage);
			  options.success = function() {
				  var xhr = {
					readystate:4,
					status:200,
					statusText:"",
					responseText:""
				  };
				  if (success) success(model, xhr, options);
			  };
			  options.error = function() {
				var xhr = {
					readystate:4,
					status:404,
					statusText:"",
					responseText:""
				};
				if (error) error(model, xhr, options);
			  };
			  window.deleteFile(options);
			  if(offlineStorage.folder == "map"){
				  function populateDB(tx) {
					  tx.executeSql('DELETE FROM MAP WHERE mapKey=?', [model.get("mapKey")]);
					  tx.executeSql('DELETE FROM CPS WHERE mapKey=?', [model.get("mapKey")]);
				  }
				  appFunc.db.transaction(populateDB, errorCB);
			  }
		  }catch(err){}
		  return this;
	  }
	}
});
_.extend(Backbone.Collection.prototype, {
	fetch2: function(options) {
	  options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var collection = this;
      var success = options.success;
	  
	  var offlineStorage = null;
	  try{offlineStorage = collection.offlineStorage(); }catch(err){}
	  
      options.success = function(resp, status, xhr) {
        var method = options.update ? 'update' : 'reset';
        collection[method](resp, options);
		if((offlineStorage == false) || (offlineStorage == null)){ // overwrite
		} else {
			try{
				function errorCB(err) {
					//alert("Error processing SQL: "+err.code+"\n"+err.message);
				}
				offlineStorage.content = xhr.responseText;
				//console.log(offlineStorage);
				window.writeFile(offlineStorage);
				if(offlineStorage.folder == "cps"){
					function populateDB(tx) {
						tx.executeSql('REPLACE INTO CPS (mapKey, logDate) VALUES (?,?)', 
									[offlineStorage.dbID, new Date()]);
					}
					appFunc.db.transaction(populateDB, errorCB);
				}
			}catch(err2){}
		}
        if (success) success(collection, resp, options);
      };
      return this.sync('read', this, options);
	},
	fetchOffline : function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === undefined) options.parse = true;
      var collection = this;
      var success = options.success;
	  var error = options.error;
	  var offlineStorage = null;
	  try{offlineStorage = collection.offlineStorage(); }catch(err){}
	  
	  if((offlineStorage == false) || (offlineStorage == null)){
		  return this.fetch(options);
	  } else {
		  $.extend(options, offlineStorage);
		  options.success = function(resp, xhr) {
			  try{
			collection[options.add ? 'add' : 'reset'](collection.parse(resp, xhr), options);
			if (success) success(collection, resp);
			  }catch(err){ /*alert("fake readFile-success (collection):\n "+err); */}
		  };
		  options.error = function(event, xhr){ 
		  try{
		  	return Backbone.wrapError(error, collection, options);
		  }catch(err){ /*alert("fake readFile-error (collection):\n "+err);*/}
		  }
		  window.readFile(options);
		  return this;
	  }
    }
	
});


window.deleteFile = function(_opt){
	if(!appFunc.isApp()){return;}
	var option = $.extend({folder:null, subfolder:null, filename:null, success:null, error:null, progress:null}, _opt);
	if(option.filename == null){return;}
	function errorCallback(event) {
		if (option.error) {
			option.error(event);
		}
	}
	
	function deleteFileFromDir(dirEntry) {
		dirEntry.getFile(option.filename, {create: true, exclusive: false},
			function(file) {
				file.remove(
				 	function success(fileEntry) {
							if (option.success) {
								option.success();
							}
						},
					errorCallback
				);
			},
			errorCallback);
	}
	
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0,
            function(fileSystem) {
				fileSystem.root.getDirectory("beyondcampus", {create: true, exclusive: false}, 
					function(dirEntry) {
						if(siteInfo.get("isAppIOS")){
							try{
								function onSetMetadataSuccess() { /*console.log("The metadata was successfully set.");*/ }
								function onSetMetadataFail() { /*alert("There was an error in setting the metadata");*/ }
								// Set the metadata
								dirEntry.setMetadata(onSetMetadataSuccess, onSetMetadataFail, { "com.apple.MobileBackup": 1});
							}catch(err){}
						}
						if(option.folder != null){
							dirEntry.getDirectory(option.folder, {create: true, exclusive: false}, 
								function(dirEntry2){
									if(option.subfolder != null){
										dirEntry2.getDirectory(option.subfolder, {create: true, exclusive: false}, deleteFileFromDir, errorCallback);
									}
									else {deleteFileFromDir(dirEntry2)}	
								}, errorCallback);
						}
						else {deleteFileFromDir(dirEntry)}
					}, errorCallback);
            },
            errorCallback);
};
window.writeFile = function(_opt){
	if(!appFunc.isApp()){return;}
	var option = $.extend({folder:null, subfolder:null, filename:null, content:"", success:null, error:null, progress:null}, _opt);
	if(option.filename == null){return;}
	function errorCallback(event) {
		if (option.error) {
			option.error(event);
		}
	}
	
	function writeFileToDir(dirEntry) {
		dirEntry.getFile(option.filename, {create: true, exclusive: false},
			function(file) {
				file.createWriter(
					function(writer) {
						writer.onwrite = function(event) {
							if (option.success) {
								option.success(event);
							}
						};
						writer.onerror = errorCallback;
						writer.write(option.content);
					},
					errorCallback);
			},
			errorCallback);
	}
	
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0,
            function(fileSystem) {
				fileSystem.root.getDirectory("beyondcampus", {create: true, exclusive: false}, 
					function(dirEntry) {
						if(siteInfo.get("isAppIOS")){
							try{
								function onSetMetadataSuccess() { /*console.log("The metadata was successfully set.");*/ }
								function onSetMetadataFail() { /*alert("There was an error in setting the metadata");*/ }
								// Set the metadata
								dirEntry.setMetadata(onSetMetadataSuccess, onSetMetadataFail, { "com.apple.MobileBackup": 1});
							}catch(err){}
						}
						if(option.folder != null){
							dirEntry.getDirectory(option.folder, {create: true, exclusive: false}, 
								function(dirEntry2){
									if(option.subfolder != null){
										dirEntry2.getDirectory(option.subfolder, {create: true, exclusive: false}, writeFileToDir, errorCallback);
									}
									else {writeFileToDir(dirEntry2)}	
								}, errorCallback);
						}
						else {writeFileToDir(dirEntry)}
					}, errorCallback);
            },
            errorCallback);
};

window.readFile = function(_opt){
	//alert("readFile function");
	if(!appFunc.isApp()){return;}
	var option = $.extend({folder:null, subfolder:null, filename:null, success:null, error:null, progress:null}, _opt);
	if(option.filename == null){return;}
	//alert("readFile: "+ option.filename);
	function errorCallback(event) {
		if (option.error) {
			var xhr = {
				readystate:4,
				status:404,
				statusText:"",
				responseText:event.target.result
			};
			option.error(event, xhr);
		}
	}
	
	function readFileFromDir(dirEntry) {
		dirEntry.getFile(option.filename, {create: false, exclusive: false},
			function(fileEntry) {
					fileEntry.file(function(file){
						var reader = new FileReader();
						reader.onloadend = function(event) {
							var data = Convert.StringToJson(event.target.result);
							if (option.success) {
								var xhr = {
									readystate:4,
									status:200,
									responseText:event.target.result
								};
								option.success(data, xhr);
							}
						};
						reader.onerror = errorCallback;
						reader.readAsText(file);
					
					}, errorCallback);
			},
			errorCallback);
	}
	
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0,
			function(fileSystem) {
				fileSystem.root.getDirectory("beyondcampus", {create: true, exclusive: false}, 
					function(dirEntry) {
						if(siteInfo.get("isAppIOS")){
							try{
								function onSetMetadataSuccess() { /*console.log("The metadata was successfully set.");*/ }
								function onSetMetadataFail() { /*alert("There was an error in setting the metadata");*/ }
								// Set the metadata
								dirEntry.setMetadata(onSetMetadataSuccess, onSetMetadataFail, { "com.apple.MobileBackup": 1});
							}catch(err){}
						}
						if(option.folder != null){
							dirEntry.getDirectory(option.folder, {create: false, exclusive: false}, 
								function(dirEntry2) {
									if(option.subfolder != null){
										dirEntry2.getDirectory(option.subfolder, {create: false, exclusive: false}, readFileFromDir, errorCallback);
									}
									else {readFileFromDir(dirEntry2)}
								}, errorCallback);
						}
						else {readFileFromDir(dirEntry)}
					}, errorCallback);
            },
			errorCallback);
};



