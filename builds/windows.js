#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const preferences_grab = require("../utils/preferences_grab.js");
const yy_inherit = require("../utils/yy_inherit.js");
const shell = require("shelljs");
const copyFileSync = require('fs-copy-file-sync');
require("colors");

const appdata = process.env.APPDATA;

DEFAULT_OPTIONS = {
    yyc: false,
    test: false,
    debug: false,
    verbose: false,

    config: "default",
    zip: undefined,
    installer: undefined,
}

let EXPORT = function(project, options) {
    options = Object.assign({},DEFAULT_OPTIONS,options);
    let command = undefined;
    let export_path = "";
    if(options.zip) {
        command="PackageZip";
        export_path = path.resolve(options.zip);
    }
    if(options.installer) {
        if(command) throw "Cannot use multiple export types";
        command="PackageNsis";
        export_path = path.resolve(options.installer);
    }
    if(options.test) {
        if(command) throw "Cannot use multiple export types";
        command="Run";
        export_path = ""
    }

    if(command) {
        runtime = makeBuildMeta(project,options,options.zip);
        shell.exec(`${runtime}\\bin\\igor.exe -options="${project.temp_path}\\build.bff" -- Windows ${command}`);
    }
}
function makeSteamOptions(project,options) {
    let steamOptions = {
        "steamsdk_path": preferences_grab("machine.Platform Settings.Steam.steamsdk_path") || ""
    }
    //Push
    console.log("Writing "+"steam_options.yy".bold.green);
    fs.writeFileSync(project.temp_path+"\\steam_options.yy", JSON.stringify(steamOptions,undefined,2), 'utf8');
}
function makePreferencesJson(project,options) {
    let prefs = {
        "default_packaging_choice": preferences_grab("machine.Platform Settings.Windows.choice"),
        "visual_studio_path": preferences_grab("machine.Platform Settings.Windows.visual_studio_path")
    }
    //Push
    console.log("Writing "+"preferences.json".bold.green);
    fs.writeFileSync(project.temp_path+"\\preferences.json", JSON.stringify(prefs,undefined,2), 'utf8');
}
function makeTargetOptions(project,options) {
    let targetoptions = {
        "runtime": options.yyc ? "YYC" : "VM"
    }
    //Push
    console.log("Writing "+"targetoptions.json".bold.green);
    fs.writeFileSync(project.temp_path+"\\targetoptions.json", JSON.stringify(targetoptions,undefined,2), 'utf8');
}
function makeMacros(project,options,runtimeLocation) {
    let macros = {
        // INPUTS
        "daveead.cd": process.cwd(),
        "daveead.tempID": project.temp_id,
        "project_name": project.project_name,
        "project_dir": project.project_dir,
        "UserProfileName": process.env.username,
        // END INPUTS

        "daveead.tempdir": "${daveead.cd}\\${daveead.tempID}",
        "daveead.gm_cache": "${daveead.tempdir}\\GMCache",
        "daveead.gm_temp": "${daveead.tempdir}\\GMTemp",
        "daveead.output": "${daveead.tempdir}\\Output",

        "project_full_filename": "${project_dir}\\${project_name}.yyp",
        "options_dir": "${project_dir}\\options",

        "project_cache_directory_name": "GMCache",
        "asset_compiler_cache_directory": "${daveead.tempdir}",

        "project_dir_inherited_BaseProject": "${runtimeLocation}\\BaseProject",
        "project_full_inherited_BaseProject": "${runtimeLocation}\\BaseProject\\BaseProject.yyp",
        "base_project": "${runtimeLocation}\\BaseProject\\BaseProject.yyp",
        "base_options_dir": "${runtimeLocation}\\BaseProject\\options",

        "local_directory": "${ApplicationData}\\${program_dir_name}",
        "local_cache_directory": "${local_directory}\\Cache",
        "temp_directory": "${daveead.gm_temp}",

        "base_project": "${runtimeLocation}\\BaseProject\\BaseProject.yyp",
        "system_directory": "${CommonApplicationData}\\${program_dir_name}",
        "system_cache_directory": "${system_directory}\\Cache",
        "runtimeBaseLocation": "${system_cache_directory}\\runtimes",
        "runtimeLocation": runtimeLocation,

        "igor_path": "${runtimeLocation}\\bin\\Igor.exe",
        "asset_compiler_path": "${runtimeLocation}\\bin\\GMAssetCompiler.exe",
        "lib_compatibility_path": "${runtimeLocation}\\lib\\compatibility.zip",
        "runner_path": "${runtimeLocation}\\windows\\Runner.exe",
        "webserver_path": "${runtimeLocation}\\bin\\GMWebServer.exe",
        "html5_runner_path": "${runtimeLocation}\\html5\\scripts.html5.zip",
        "adb_exe_path": "platform-tools\\adb.exe",
        "java_exe_path": "bin\\java.exe",
        "licenses_path": "${exe_path}\\Licenses",

        "keytool_exe_path": "bin\\keytool.exe",
        "openssl_exe_path": "bin\\openssl.exe",

        "program_dir_name": "GameMakerStudio2",
        "program_name": "GameMakerStudio2",
        "program_name_pretty": "GameMaker Studio 2",

        "default_font": "Open Sans",
        "default_style": "Regular",
        "default_font_size": "9",

        "ApplicationData": "${UserProfile}\\AppData\\Roaming",
        "CommonApplicationData": "C:\\ProgramData",
        "ProgramFiles": "C:\\Program Files",
        "ProgramFilesX86": "C:\\Program Files (x86)",
        "CommonProgramFiles": "C:\\Program Files\\Common Files",
        "CommonProgramFilesX86": "C:\\Program Files (x86)\\Common Files",
        "UserProfile": "C:\\Users\\${UserProfileName}",
        "TempPath": "${UserProfile}\\AppData\\Local",
        "exe_path": "${ProgramFiles}\\GameMaker Studio 2",
    }
    //Push
    console.log("Writing "+"macros.json".bold.green);
    fs.writeFileSync(project.temp_path+"\\macros.json", JSON.stringify(macros,undefined,2), 'utf8');
}
function makeOptions(project,options,runtimeLocation) {
    console.log("Writing "+"MainOptions.json".bold.green);
    yy_inherit(
        project.project_dir+"\\options\\main\\inherited\\options_main.inherited.yy",
        runtimeLocation+"\\BaseProject\\options\\main\\options_main.yy",
        project.temp_path+"\\GMCache\\MainOptions.json");

    console.log("Writing "+"PlatformOptions.json".bold.green);
    copyFileSync(project.project_dir+"\\options\\windows\\options_windows.yy",project.temp_path+"\\GMCache\\PlatformOptions.json");
}
function makeBuildMeta(project,options,targetFile) {
    fs.mkdirSync(project.temp_path+"\\GMCache");
    fs.mkdirSync(project.temp_path+"\\GMTemp");
    fs.mkdirSync(project.temp_path+"\\Output");
    let bff = {};
    bff.targetFile = targetFile;
    bff.assetCompiler = "";
    bff.debug = options.debug ? "True" : "False";
    bff.compile_output_file_name = project.temp_path+"\\Output\\"+project.project_name+".win";
    bff.useShaders = "True";
    bff.steamOptions = project.temp_path+"\\steam_options.yy";
    makeSteamOptions(project,options);
    bff.config = options.config;
    bff.outputFolder = project.temp_path+"\\Output";
    bff.projectName = project.project_name
    bff.projectDir = project.project_dir;
    bff.preferences = project.temp_path+"\\preferences.json";
    makePreferencesJson(project,options);
    bff.projectPath = project.project_path;
    bff.tempFolder = project.temp_path+"\\GMTemp";

    let umJson = JSON.parse(fs.readFileSync(appdata+"\\GameMakerStudio2\\um.json"))
    let userID = umJson.username.substring(0,umJson.username.indexOf("@")) + "_" + umJson.userID;
    bff.userDir = appdata + "\\GameMakerStudio2\\" + userID;

    let runtimes = JSON.parse(fs.readFileSync("C:\\ProgramData\\GameMakerStudio2\\runtime.json"))
    bff.runtimeLocation = runtimes[runtimes.active];
    bff.runtimeLocation = bff.runtimeLocation.substring(0, bff.runtimeLocation.indexOf('&'));

    bff.applicationPath = "C:\\Program Files\\GameMaker Studio 2\\GameMakerStudio.exe";

    bff.macros = project.temp_path+"\\macros.json";
    makeMacros(project,options,bff.runtimeLocation);

    bff.targetOptions = project.temp_path+"\\targetoptions.json";
    makeTargetOptions(project,options);

    bff.targetMask = "64";
    bff.verbose = options.verbose ? "True" : "False";

    bff.helpPort = "51290"; // todo get these, but not too important
    bff.debuggerPort = "6509"

    //Push
    console.log("Writing "+"build.bff".bold.green);
    fs.writeFileSync(project.temp_path+"\\build.bff", JSON.stringify(bff,undefined,2), 'utf8');

    makeOptions(project,options,bff.runtimeLocation);

    return bff.runtimeLocation;
}
module.exports = EXPORT;
