const fs = require('fs');

const CONTROL_INSERT_START_ID = "←"; // uh
const CONTROL_INSERT_END_ID = "|";

let yy_inherit = function(file_path, parent_path, out_file) {
	let parent = JSON.parse(fs.readFileSync(parent_path));
	let inherited = fs.readFileSync(file_path).toString();

	let ins_id = "";
	let ins_content = "";
	let ins_state = "SEEK";

	let changes = [];

	for (var i = 0; i < inherited.length; i++) {
		var char = inherited.charAt(i);
		switch (ins_state) {
			case "SEEK":
				ins_id = "";
				ins_content = "";
				if(char==CONTROL_INSERT_START_ID) {
					ins_state = "READ_ID";
				}
				break;
			case "READ_ID":
				if(char!=CONTROL_INSERT_END_ID) {
					ins_id += char;
					if(char==CONTROL_INSERT_START_ID) {
						ins_id = "";
						ins_content = "";
					}
				} else {
					ins_state = "none";
					// parse json
					bracked_count = 1;
					i+=2;
					while(bracked_count!=0) {
						char = inherited.charAt(i);
						ins_content+=char;
						if(char=="{") {
							bracked_count++;
						} else if(char=="}") {
							bracked_count--;
						}
						i++;
					}
					i-=2;
					ins_state = "SEEK";
					changes.push({id:ins_id,changes:JSON.parse("{"+ins_content)});
				}
			break;
		}
	}
	let combine;
	// recursive function for doing combine the parent object with the array
	combine = function(object,changes) {
		for(var attributename in object){
			if(typeof object[attributename] === 'object') {
				object[attributename] = combine(object[attributename],changes);
			}
			if(typeof object[attributename] === 'array') {
				object[attributename] = combine(object[attributename],changes);
			}
		}
		if(object) {
			for (var i = 0; i < changes.length; i++) {
				if(object.id == changes[i].id) {
					Object.assign(object, changes[i].changes);
				}
			}
		}
		return object
	}
	parent = combine(parent,changes);
	fs.writeFileSync(out_file,JSON.stringify(parent,undefined,2));
}
module.exports = yy_inherit;
