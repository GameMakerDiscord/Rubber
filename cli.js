#!/usr/bin/env node
require("colors");
const rubber = require("./rubber.js");

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

// Call Rubber
for (var i = 0; i < build_tree.length; i++) {
	let build = build_tree[i];
	if(build.name in rubber) {
		try {
			rubber[build.name](process.argv[0],build.options);
		} catch (e) {
			console.log(`Error in build ${build.name}`.bold.red+": "+e);
		}
	}
}
