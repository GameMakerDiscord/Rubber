// Allows you to compile a GameMaker Project
// on the windows platform.
import * as fse from "fs-extra";
import { dirname, join, resolve, basename, extname } from "path";
import { getUserDir, readLocalSetting } from "./utils/preferences_grab";
import { inheritYYFile } from "./utils/yy_inherit";
import { spawn } from "child_process";
import { RubberEventEmitter } from "./rubber-events";
import { IRuntimeIndex, IBuildMeta, IBuildSteamOptions, IBuildPreferences, IBuildTargetOptions, IWindowsOptions} from "./build-typings";
import { EventEmitter } from "events";
import { uuid } from "./utils/uuid";

// TODO: PLATFORM INCOMPATIBILITY
const tempFolder = process.env.TEMP;
const appdataFolder = process.env.APPDATA;

export interface IRubberOptions {
    /** Path to the .yyp file, this can be relative or absolute */
    projectPath: string;

    /** Use YoYoCompiler instead of VM, default false */
    yyc?: boolean;
    /** Set Debugger Port, default disable debugger */
    debug?: number;
    /** Enable Verbose on IGOR.exe, default false */
    verbose?: boolean;
    /** Toggle whether to use the EA version */
    ea?:boolean;

    /** Set GameMaker configuration, default "default" */
    config?: string;

    /** Type of build to run. */
    build: "test" | "zip" | "installer";
    /** Output of the build, set "" if build="test" */
    outputPath: string;

    /** Alternate Runtime Location */
    runtimeLocation?: string;

    /** The Runtime to Use*/
    theRuntime?: string;

    /** Alternate GameMakerStudio2 Install Directory */
    gamemakerLocation?: string;
    /** Alternate GameMakerStudio2 ProgramData Directory */
    gamemakerDataLocation?: string;

    /** Target Device Config File Directory */
    deviceConfigFileLocation?: string;

    /** Target Device Name*/
    targetDeviceName?: string;    

    platform: "windows" |
        "mac" |
        "linux" |
        "ios" |
        "android" |
        "ps4" |
        "xboxone" |
        "switch" |
        "html5" |
        "uwp";
}

/**
 * @param projectFile Path to the .yyp project
 * @param options Object containing build information.
 */
export function compile(options: IRubberOptions) {
    const emitter = new EventEmitter() as RubberEventEmitter; // we dont need the overhead of a sub class
    const projectFile = resolve(options.projectPath);
    const platform = options.platform;

    // Choose a specific runtime or use the active one if left blank
    const theRuntime = options.theRuntime ? options.theRuntime : "";

    // Build component for checking later.
    let component = "";
    let componentBuild = "";
    

    // Find out what Igor.exe needs based on the platform
    let defaultPackageKey = "Package";
    let requireRemoteClient = false;    
    let packageOnly = false;
    switch (platform){
        case "android":
            component = "Android";
            componentBuild = "android.build_module";
            break;
        case "switch":
            component = "Switch";
            componentBuild = "switch.build_module";
            break;            
        case "windows":
            //Windows uses a different key for Igor to build package
            defaultPackageKey = "PackageZip";
            component = "Windows";
            componentBuild = "Windows.build_module";
            break;
        case "mac":
            component = "Mac";
            componentBuild = "Mac.build_module";
            requireRemoteClient = true;
            break;
        case "ios":
            // iOS can only support build package and the rest needs to be completed in XCode
            component = "iOS";
            componentBuild = "ios.build_module";
            requireRemoteClient = true;
            packageOnly = true;
            break;
        case "linux":
            component = "Linux";
            componentBuild = "Linux.build_module";
            requireRemoteClient = true;
            break;                                         
        default:
            component = "Unsupported";
            break;                
    }

    //Check target device name against the target device config file later
    let targetDeviceName = options.targetDeviceName ? options.targetDeviceName : "";

    // We want to run stuff async with await, so this will be in its own function.
    const asyncRun = async() => {
        // !!! Other platforms support
        if(component === "Unsupported") throw new Error("Cannot compile to unsupported platform '" + platform + "'");

        // iOS can only support build package and the rest needs to be completed in XCode
        if(packageOnly && options.build !== "zip") throw new Error("Can only build package for '" + platform + "'");
        
        // only Windows supports installer
        if(component !== "Windows" && options.build === "installer") throw new Error("Only Windows can build installer'");

        //#region Get Project Data
        // Make sure some envirionment variables are set.
        if (tempFolder === undefined || appdataFolder === undefined) {
            throw new Error("%temp% and/or %appdata% is missing in the environment variables.");
        }
        if (process.env.username === undefined) {
            throw new Error("%username% is missing in the environment variables.");
        }

        // Fill in some defaults
        if (typeof options.gamemakerDataLocation === "undefined") {
            if (options.ea){
                options.gamemakerDataLocation = "C:\\ProgramData\\GameMakerStudio2-EA";
            }
            else{
                options.gamemakerDataLocation = "C:\\ProgramData\\GameMakerStudio2";
            }
        }

        if (typeof options.gamemakerLocation === "undefined" || options.gamemakerLocation === ""){
            if (options.ea){
                options.gamemakerLocation = "C:\\Program Files\\GameMaker Studio 2-EA";
            }
            else{
                options.gamemakerLocation = "C:\\Program Files\\GameMaker Studio 2";
            }            
        }
        else{
            if(!(await fse.pathExists(options.gamemakerLocation))) {
                throw new Error("The alternative GMS installation directory does not exist!");
            }
        }


        let deviceConfig;
        let targetOptionValues;
        let iosHostMacValues;                    
        if ((typeof options.deviceConfigFileLocation === "undefined" || options.deviceConfigFileLocation === "")){          
            if (requireRemoteClient){
                throw new Error("This platform requires a target device config file");
            }
        }
        else if (!(await fse.pathExists(options.deviceConfigFileLocation))) {
            throw new Error("The Target device config file does not exist!");
        }
        else{
            try{
                deviceConfig = (await fse.readJson(options.deviceConfigFileLocation));
            }
            catch(e){
                throw new Error("Invalid Target device config file.");
            }    

            //Validate the Target Device Name or grab the first device if left empty
            let devices;
            switch (platform){
                case "android":
                    //Android is nested one layer more
                    devices = deviceConfig[platform].Auto;
                    break;
                default:
                    devices = deviceConfig[platform];
                    break;                
            }
            
            if (targetDeviceName === ""){
                //If left empty, grab the first available device
                targetDeviceName = Object.keys(devices)[0];
            }
            else{
                if (!devices[targetDeviceName]){
                    throw new Error("Cannot find target device name in the target device config file");
                }
            }

            targetOptionValues = devices[targetDeviceName];
            if (platform == "ios"){
                // iOS requires the a host MacOS to build
                iosHostMacValues = deviceConfig.mac[targetOptionValues.hostmac];
                if (!iosHostMacValues){
                    throw new Error("Building for iOS requires the host Mac info in the device config file");
                }
            }            
        }             
        
        
        // Compile process starts now, emit the starting event.
        emitter.emit("compileStatus", "Starting Rubber\n");
        
        // Get some project path data.
        const projectDir = dirname(projectFile);
        const projectName = basename(projectFile).substring(0, basename(projectFile).length - extname(projectFile).length);
        
        if (!(await fse.pathExists(join(projectDir, "options", "main", "inherited", "options_main.inherited.yy")))) {
            throw new Error("Missing options_main.inherited.yy. This can be because of a partial project, or the usage of a differen parent project structure.")
        }
        const guid_match = (await fse.readFile(join(projectDir, "options", "main", "inherited", "options_main.inherited.yy")))
            .toString()
            .match('"option_gameguid": "(.*?)"');
        if (!guid_match) {
            throw new Error("options_main.inherited.yy is missing project GUID, cannot identify project.");
        }
        const guid = guid_match[1];
        
        const buildTempPath = join(tempFolder, "gamemaker-rubber", guid);
        let runtimeLocation = "";
        if (options.runtimeLocation) {
            runtimeLocation = options.runtimeLocation;
        } else {
            // Search for latest installed runtime.
            const runtimeIndexPath = join(options.gamemakerDataLocation, "runtime.json");
            if (await fse.pathExists(runtimeIndexPath)) {
                let runtimes: IRuntimeIndex;
                try {
                    runtimes = JSON.parse((await fse.readFile(runtimeIndexPath)).toString());
                } catch(e) {
                    throw new Error("Invalid GameMaker Studio 2 Runtime Index. Reinstall GameMaker.");
                }
    
                if (theRuntime === ""){
                    // Use the active runtime if user did not specify
                    if (typeof runtimes.active !== "string") {
                        throw new Error("GameMaker has no active runtime, start up GameMaker and compile a project first.");
                    }                                        
                    runtimeLocation = runtimes[runtimes.active];
                }
                else{
                    if (runtimes[theRuntime]){
                        runtimeLocation = runtimes[theRuntime];
                    }
                    else{
                        throw new Error("Cannot find the chosen runtime. Make sure the input is correct and the runtime is downloaded.");                        
                    }
                }
                runtimeLocation = runtimeLocation.substring(0, runtimeLocation.indexOf("&"));
            } else {
                throw new Error("Cannot Locate GameMaker Studio 2 Runtimes. Either GameMaker is installed somewhere else, or is not been setup.");
            }
        }

        const userDir = await getUserDir();
        const licensePlist = (await fse.readFile(join(userDir, "licence.plist"))).toString();
        const allowedComponents = (licensePlist.match(/<key>components<\/key>.*?\n.*?<string>(.*?)<\/string>/) as any)[1].split(";");

        if (!allowedComponents.includes(componentBuild)) {
            throw new Error("You dont have the permission to build a GameMaker game for " + platform + ". This happens if your logged in as someone else, or didnt buy the module.");
        }
        //#endregion

        // Now we got all the data about the project, runtimes, now to actually run IGOR

        //#region Setup and run IGOR.
        /*
            * My method of setting up IGOR runs as follows:
            * 1. Create 3 Folders replicating the IDE's Cache, Temp, and Output folders.
            * 2. Fill out all the JSON Files,  TODO: Upload my documentation about it.
            * 3. Invoke IGOR via the command line.
            */
    
        // 1.
        await fse.mkdirs(join(buildTempPath, "GMCache"));
        await fse.mkdirs(join(buildTempPath, "GMTemp"));
        await fse.mkdirs(join(buildTempPath, "Output"));
    
        // 2.
        /* There are 3 Files we need to create:
            * a. build.bff
            * b. macros.json
            * *c. preferences.json
            * *d. steam_options.yy (json)
            * e. targetoptions.json
            * *f. MainOptions.json
            * *g. PlatformOptions.json
            * 
            * Marked with * were found unnecessary by #9
            */
    
        emitter.emit("compileStatus", "Creating Build Data\n");
        // a.
        const buildMeta: IBuildMeta = {
            applicationPath: join(options.gamemakerLocation, options.ea ? "GameMakerStudio-EA.exe" : "GameMakerStudio.exe"),
            assetCompiler: "",
            compile_output_file_name: join(buildTempPath, "Output", projectName + ".win"),
            config: (options.config) ? options.config : "default",
            debug: (options.debug !== undefined) ? "True" : "False",
            debuggerPort: (options.debug) ? options.debug.toString() : "6509",
            helpPort: "51290",
            macros: join(buildTempPath, "macros.json"),
            outputFolder: join(buildTempPath, "Output"),
            preferences: join(buildTempPath, "preferences.json"),
            projectDir: projectDir,
            projectName: projectName,
            projectPath: projectFile,
            runtimeLocation: runtimeLocation,
            steamOptions: join(buildTempPath, "steam_options.yy"),
            targetFile: options.outputPath,
            targetMask: "64",
            targetOptions: join(buildTempPath, "targetoptions.json"),
            tempFolder: join(buildTempPath, "GMTemp"),
            useShaders: "True",
            userDir: userDir,
            verbose: (options.verbose === true) ? "True" : "False",
        };
        await fse.writeFile(join(buildTempPath, "build.bff"), JSON.stringify(buildMeta));
        
        // b.
        const macros: { [macro: string]: string } = {
            // INPUTS
            "project_name": projectName,
            "project_dir": projectDir,
            "UserProfileName": process.env.username,
            // END INPUTS

            "custom.tempdir": buildTempPath,
            "custom.gm_cache": "${custom.tempdir}\\GMCache",
            "custom.gm_temp": "${custom.tempdir}\\GMTemp",
            "custom.output": "${custom.tempdir}\\Output",

            "project_full_filename": "${project_dir}\\${project_name}.yyp",
            "options_dir": "${project_dir}\\options",

            "project_cache_directory_name": "GMCache",
            "asset_compiler_cache_directory": "${custom.tempdir}",

            "project_dir_inherited_BaseProject": "${runtimeLocation}\\BaseProject",
            "project_full_inherited_BaseProject": "${runtimeLocation}\\BaseProject\\BaseProject.yyp",
            "base_project": "${runtimeLocation}\\BaseProject\\BaseProject.yyp",
            "base_options_dir": "${runtimeLocation}\\BaseProject\\options",

            "local_directory": "${ApplicationData}\\${program_dir_name}",
            "local_cache_directory": "${local_directory}\\Cache",
            "temp_directory": "${custom.gm_temp}",

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

            "GMS_name": options.ea ? "GameMakerStudio2" : "GameMakerStudio2-EA",
            "program_dir_name": "${GMS_name}",
            "program_name": "${GMS_name}",
            "program_name_pretty": "${GMS_name}",

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
            "exe_path": options.ea ? "${ProgramFiles}\\GameMaker Studio 2" : "${ProgramFiles}\\GameMaker Studio 2-EA",
        }
        await fse.writeFile(join(buildTempPath, "macros.json"), JSON.stringify(macros));

        // c.
        /*
        const preferences: IBuildPreferences = {
            default_packaging_choice: 2,
            visual_studio_path: await readLocalSetting("machine.Platform Settings.Windows.visual_studio_path"),
        };
        await fse.writeFile(join(buildTempPath, "preferences.json"), JSON.stringify(preferences));
        */

        // d.
        /*
        const steamOptions: IBuildSteamOptions = {
            steamsdk_path: await readLocalSetting("machine.Platform Settings.Steam.steamsdk_path"),
        };
        await fse.writeFile(join(buildTempPath, "steam_options.yy"), JSON.stringify(steamOptions));
        */

        // e.
        const targetoptions: IBuildTargetOptions = {
            /** 
             * 1. If remote client is not required, only need to know if building for YYC or VM
             * 2. If building for iOS, need to also read the config info from the host Mac
            */
            runtime: options.yyc ? "YYC" : "VM",
            displayname: requireRemoteClient && targetOptionValues.displayname ? targetOptionValues.displayname : "",
            productType: requireRemoteClient && targetOptionValues.productType ? targetOptionValues.productType : "",
            version: requireRemoteClient && targetOptionValues.version ? targetOptionValues.version : "",
            device: requireRemoteClient && targetOptionValues.device ? targetOptionValues.device : "",
            type: requireRemoteClient && targetOptionValues.type ? targetOptionValues.type : "",
            status: requireRemoteClient && targetOptionValues.status ? targetOptionValues.status : "",
            hostmac: requireRemoteClient && targetOptionValues.hostmac ? targetOptionValues.hostmac : "",
            deviceIP: requireRemoteClient && targetOptionValues.deviceIP ? targetOptionValues.deviceIP : "",
            target_ip: requireRemoteClient && targetOptionValues.target_ip ? targetOptionValues.target_ip : "",
            hostname: platform === "ios" ? iosHostMacValues.hostname : (requireRemoteClient && targetOptionValues.hostname ? targetOptionValues.hostname : ""),            
            username: platform === "ios" ? iosHostMacValues.username : (requireRemoteClient && targetOptionValues.username ? targetOptionValues.username : ""),
            encrypted_password: platform === "ios" ? iosHostMacValues.encrypted_password : (requireRemoteClient && targetOptionValues.encrypted_password ? targetOptionValues.encrypted_password : ""),
            install_dir: platform === "ios" ? iosHostMacValues.install_dir : (requireRemoteClient && targetOptionValues.install_dir ? targetOptionValues.install_dir : "")            
        };
        await fse.writeFile(join(buildTempPath, "targetoptions.json"), JSON.stringify(targetoptions));
    
        // f.
        /*
        await inheritYYFile(join(projectDir, "options/main/inherited/options_main.inherited.yy"),
            join(runtimeLocation, "/BaseProject/options/main/options_main.yy"),
            join(buildTempPath, "GMCache/MainOptions.json"));
        */

        // g.
        /*
        if (await fse.pathExists(join(projectDir, "options/windows/options_windows.yy"))) {
            await fse.copy(join(projectDir, "options/windows/options_windows.yy"), join(buildTempPath, "GMCache/PlatformOptions.json"));
        } else {
            // Write one manually
            // !!! I hate doing this i would really want to like find a copy already in the runtime.
            const windows_options: IWindowsOptions = {
                id: uuid(),
                modelName: "GMWindowsOptions",
                mvc: "1.0",
                name: "Windows",
                option_windows_allow_fullscreen_switching: false,
                option_windows_borderless: false,
                option_windows_company_info: "YoYo Games Ltd",
                option_windows_copy_exe_to_dest: false,
                option_windows_copyright_info: "(c) 2018 CompanyName",
                option_windows_description_info: "A GameMaker Studio 2 Game",
                option_windows_display_cursor: true,
                option_windows_display_name: "Made in GameMaker Studio 2",
                option_windows_enable_steam: false,
                option_windows_executable_name: "${project_name}",
                option_windows_icon: "${base_options_dir}\\windows\\icons\\icon.ico",
                option_windows_installer_finished: "${base_options_dir}\\windows\\installer\\finished.bmp",
                option_windows_installer_header: "${base_options_dir}\\windows\\installer\\header.bmp",
                option_windows_interpolate_pixels: false,
                option_windows_license: "${base_options_dir}\\windows\\installer\\license.txt",
                option_windows_nsis_file: "${base_options_dir}\\windows\\installer\\nsis_script.nsi",
                option_windows_product_info: "Made in GameMaker Studio 2",
                option_windows_resize_window: false,
                option_windows_save_location: 0,
                option_windows_scale: 0,
                option_windows_sleep_margin: 10,
                option_windows_splash_screen: "${base_options_dir}\\windows\\splash\\splash.png",
                option_windows_start_fullscreen: false,
                option_windows_texture_page: "2048x2048",
                option_windows_use_splash: false,
                option_windows_version: {
                    build: 0,
                    major: 1,
                    minor: 0,
                    revision: 0
                },
                option_windows_vsync: false
            }
            await fse.writeFile(join(buildTempPath, "GMCache/PlatformOptions.json"), JSON.stringify(windows_options));
        }
        */

        emitter.emit("compileStatus", "Running IGOR\n");
        const exportType = options.build == "test" ? "Run" : (options.build === "zip" ? defaultPackageKey : "PackageNsis")
        const igorArgs = ["-options=" + join(buildTempPath, "build.bff"), "--", component, exportType];
        const igor = spawn(join(runtimeLocation, "bin", "Igor.exe"), igorArgs);
    
        // !!! #8 todo: store errors here, emit at end.
        const igorErrors: string[] = [];

        const lanchingGame = options.build == "test";
        let igorState: "igor" | "game" = "igor";

        igor.stdout.on('data', (data: Buffer) => {
            if (lanchingGame && data.toString().includes("Runner.exe  -game")) {
                emitter.emit("compileFinished", igorErrors);
                emitter.emit("gameStarted");
                igorState = "game";
            }
            if (igorState == "igor") {
                if (data.toString().toLowerCase().startsWith("error")) {
                    igorErrors.push(data.toString());
                }
                emitter.emit("compileStatus", data.toString())
            } else {
                emitter.emit("gameStatus", data.toString())
            }
            emitter.emit("rawStdout", data.toString())
        });
    
        igor.stderr.on('data', (data) => {
            emitter.emit("rawStdout", data.toString())
            if (igorState == "igor") {
                emitter.emit("compileStatus", data.toString())
            } else {
                emitter.emit("gameStatus", data.toString())
            }
        });
    
        igor.on('close', async(code) => {
            if (!lanchingGame) {
                emitter.emit("compileFinished", igorErrors);
            } else {
                if (code !== 0) emitter.emit("compileFinished", igorErrors);
                emitter.emit("gameFinished");
            }
            if (code !== 0 || igorErrors.length > 0) {
                emitter.emit("error", new Error("IGOR Failed. Check compile log."));
            }
            emitter.emit("allFinished", igorErrors);
        });
        //#endregion
    }
    // Run the async function later
    // This ensures that event handlers are registered.
    setTimeout(() => {
        asyncRun().catch(error => {
            // throw inside async function ==> emit error
            emitter.emit("error", error)
        });
    }, 0);
    return emitter;
}

/** Cleans rubber's cache for the project. */
export async function clearCache(projectPath: string) {
    if (tempFolder === undefined) {
        throw new Error("%temp% is missing in the environment variables.");
    }
    const projectDir = dirname(projectPath);
    if (!(await fse.pathExists(join(projectDir, "options", "main", "inherited", "options_main.inherited.yy")))) {
        throw new Error("Missing options_main.inherited.yy. This can be because of a partial project, or the usage of a differen parent project structure.")
    }
    const guid_match = (await fse.readFile(join(projectDir, "options", "main", "inherited", "options_main.inherited.yy")))
        .toString()
        .match('"option_gameguid": "(.*?)"');
    if (!guid_match) {
        throw new Error("options_main.inherited.yy is missing project GUID, cannot identify project.");
    }
    const guid = guid_match[1];

    // delete the folder
    await fse.remove(join(tempFolder, "gamemaker-rubber", guid));
}

interface IRubberWindowsOptions {
    /** Path to the .yyp file, this can be relative or absolute */
    projectPath: string;

    /** Use YoYoCompiler instead of VM, default fase */
    yyc?: boolean;
    /** Set Debugger Port, default disable debugger */
    debug?: number;
    /** Enable Verbose on IGOR.exe, default false */
    verbose?: boolean;

    /** Set GameMaker configuration, default "default" */
    config?: string;

    /** Type of build to run. */
    build: "test" | "zip" | "installer";
    /** Output of the build, set "" if build="test" */
    outputPath: string;

    /** Alternate Runtime Location */
    runtimeLocation?: string;
    /** Alternate GameMakerStudio2 Install Directory */
    gamemakerLocation?: string;
    /** Alternate GameMakerStudio2 ProgramData Directory */
    gamemakerDataLocation?: string;
}

/** Deprecated: Use compile(), Compiles a project. */
export function windows(options: IRubberWindowsOptions) {
    
    // call compile() with platform set.
    (options as IRubberOptions).platform = "windows";
    return compile(options as IRubberOptions);
}