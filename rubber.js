require("colors");
const fs = require("fs");
const path = require("path");
const zip = require('zip-local');
const rimraf = require('rimraf');
const uuid4 = require('uuid/v4');
const yy_inherit = require("./utils/yy_inherit.js");
const preferences_grab = require("./utils/preferences_grab.js");

// Temp Folder
let temp_id = undefined;
let temp_path = "";
let makeTempFolder = function() {
	if(temp_id == undefined) {
		temp_id = "TEMP_"+uuid4().substr(0,8).toUpperCase();
		if (!fs.existsSync(temp_id)){
			fs.mkdirSync(temp_id);
		}
		temp_path = process.cwd() + "\\" + temp_id;
	}
}
let clean = function() {
	if(temp_id == undefined) return;
	rimraf.sync(temp_path);
	temp_id = undefined;
	temp_path = undefined;
}

// Get all builds
let BuildList = {};
fs.readdirSync(path.join(__dirname, "builds")).forEach(function(file) {
	BuildList[file.substr(0,file.indexOf("."))] = function (project_path,options) {
		// Validate Project and get some vars
		let project_dir = "unknown";
		let project_name = "unknown";
		if(fs.existsSync(project_path)) {
			if(fs.lstatSync(project_path).isDirectory()) {
				//find yyp inside
				project_name = path.basename(project_path);
				if(fs.existsSync(project_path+"\\"+project_name+".yyp")) {
					project_dir = project_path;
					project_path = project_path+"\\"+project_name+".yyp";
					console.log("Found a project at "+project_path.bold.yellow);
				} else {
					throw "Could not find a project inside the folder given."
					return
				}
			} else {
				if(path.extname(project_path) == ".yyz") {
					console.log("Found a compressed project at "+project_path.bold.yellow+", decompressing.");
					// extract to an existing directory
					makeTempFolder();
					fs.mkdirSync(temp_path+"\\project\\");
					zip.sync.unzip(project_path).save(temp_path+"\\project\\");
					// uncompress
					project_path = temp_path+"\\project\\"+path.basename(project_path).slice(0,-4)+".yyp";
					project_dir = path.dirname(project_path);
					project_name = path.basename(project_path).slice(0,-4);
				} else if(path.extname(project_path) == ".yyp") {
					console.log("Found a project at "+project_path.bold.yellow);
					// set vars
					project_dir = path.dirname(project_path);
					project_name = path.basename(project_path).slice(0,-4);;
				}
			}
		} else {
			throw "File does not exist";
			return;
		}
		makeTempFolder();
		let project = {
			project_dir: project_dir,
			project_path: project_path,
			project_name: project_name,

			temp_id: temp_id,
			temp_path: temp_path
		}
		require("./builds/" + file)(project,options);
		clean();
	}
});
module.exports = BuildList;
