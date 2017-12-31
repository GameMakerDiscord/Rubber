#!/usr/bin/env node
require("colors");
const fs = require("fs");
const path = require("path");
const zip = require('zip-local');
const rimraf = require('rimraf');
const uuid4 = require('uuid/v4');
const yy_inherit = require("./utils/yy_inherit.js");
const preferences_grab = require("./utils/preferences_grab.js");
//const mkdirs = require("./utils/mkdirs.js"); // this is a sync funciton


//Make `build_tree` from command line args
process.argv.splice(0, 2)
let build_tree = [];
let current_build = {};
let state = "BUILD_NAME";
for (var i = 1; i < process.argv.length; i++) {
	switch (state) {
		case "BUILD_NAME":
			current_build = {name: process.argv[i],options:{}};
			state = "PARAM_NAME";
			break;
		case "PARAM_NAME":
			if(process.argv[i].toLowerCase() == "and") {
				build_tree.push(current_build);
				state = "BUILD_NAME";
			} else if(process.argv[i].startsWith("-")) {
				current_build.options[process.argv[i].substring(1)] = true;
				if(typeof process.argv[i+1] !== 'undefined') {
					if(!process.argv[i+1].startsWith("-") && process.argv[i+1].toLowerCase() != "and") {
						current_build.options[process.argv[i].substring(1)] = process.argv[i+1];
						i++;
					}
				}
			} else {
				//u broke it
				throw new Error("expected an option (ex. -yyc) but got "+process.argv[i])
			}
			break;
	}
}
if(state=="PARAM_NAME") build_tree.push(current_build); // push last build

// Temp Folder
let temp_id = undefined;
let temp_path = undefined;
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
	rimraf.sync(temp_path);
}

// Validate Project and get some vars
let project_path = path.resolve(process.argv[0]);
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
			console.log("Error:".bold.red+" Could not find a project inside the folder given.");
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
	console.log("Error:".bold.red+" File does not exist.");
	return;
}

// Get all builds
let BuildList = {};
fs.readdirSync(path.join(__dirname, "builds")).forEach(function(file) {
	BuildList[file.substr(0,file.indexOf("."))] = require("./builds/" + file);
});

// Loop and run all builds
makeTempFolder();
let project = {
	project_dir: project_dir,
	project_path: project_path,
	project_name: project_name,

	temp_id: temp_id,
	temp_path: temp_path
}
for (var i = 0; i < build_tree.length; i++) {
	let build = build_tree[i];
	if(build.name in BuildList) {
		BuildList[build.name](project,build.options);
	}
}
clean(); // dont run; debugging purposes
