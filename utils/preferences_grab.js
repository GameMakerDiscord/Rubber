const fs = require('fs');
let preferences_cache = undefined;
let preferences_grab = function(option) {
	if(preferences_cache==undefined) {
		let um = JSON.parse(fs.readFileSync(`${process.env.APPDATA}\\GameMakerStudio2\\um.json`));
		let preferences_location = `${process.env.APPDATA}\\GameMakerStudio2\\` + um.username.substring(0, um.username.indexOf('@')) + "_" + um.userID + `\\local_settings.json`;
		preferences_cache = JSON.parse(fs.readFileSync(preferences_location));
	}
	return preferences_cache[option];
}
module.exports = preferences_grab;
