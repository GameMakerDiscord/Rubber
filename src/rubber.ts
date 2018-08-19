import * as fse from "fs-extra";
import { dirname, join, resolve, basename, extname } from "path";
import { getUserDir, readLocalSetting } from "./utils/preferences_grab";
import { inheritYYFile } from "./utils/yy_inherit";
import { spawn } from "child_process";
import { RubberEventEmitter } from "./rubber-events";
import { IRuntimeIndex, IBuildMeta, IBuildSteamOptions, IBuildPreferences, IBuildTargetOptions } from "./build-typings";
import { EventEmitter } from "events";

// TODO: PLATFORM INCOMPATIBILITY
const tempFolder = process.env.TEMP;
const appdataFolder = process.env.APPDATA;

export interface IRubberOptions {
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

/**
 * @param projectFile Path to the .yyp project
 * @param options Object containing build information.
 * @throws If any error happens
 */
export function windows(options: IRubberOptions) {
    const emitter = new EventEmitter() as RubberEventEmitter; // we dont need the overhead of a sub class
    const projectFile = resolve(options.projectPath);
    const component = "Windows";
    const componentBuild = "Windows.build_module";
    const asyncRun = async() => {
        if (tempFolder === undefined || appdataFolder === undefined) {
            throw new Error("%temp% or %appdata% is missing in the environment variables. Error Code Rubber01");
        }
        if (process.env.username === undefined) {
            throw new Error("%username% is missing in the environment variables. Error Code Rubber04");
        }

        // Fill in some defaults
        if (typeof options.gamemakerDataLocation === "undefined") {
            options.gamemakerDataLocation = "C:\\ProgramData\\GameMakerStudio2";
        }
        if (typeof options.gamemakerLocation === "undefined") {
            options.gamemakerLocation = "C:\\Program Files\\GameMaker Studio 2";
        }
        
        emitter.emit("compileStatus", "Starting Rubber\n");
        const buildTempPath = join(tempFolder, "rubber-build-" + Math.round(Math.random() * 99999));
        const projectDir = dirname(projectFile);
        const projectName = basename(projectFile).substring(0, basename(projectFile).length - extname(projectFile).length);
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
                    throw new Error("Invalid GameMaker Studio 2 Runtime Index. Error Code Rubber03");
                }
    
                if (typeof runtimes.active !== "string") {
                    throw new Error("Cannot Locate GameMaker Studio 2 Runtimes. Error Code Rubber02");
                }
    
                runtimeLocation = runtimes[runtimes.active];
                runtimeLocation = runtimeLocation.substring(0, runtimeLocation.indexOf("&"));
            } else {
                throw new Error("Cannot Locate GameMaker Studio 2 Runtimes. Error Code Rubber02");
            }
        }
        const userDir = await getUserDir();
        const licensePlist = (await fse.readFile(join(userDir, "licence.plist"))).toString();
        const allowedComponents = (licensePlist.match(/<key>components<\/key>.*?\n.*?<string>(.*?)<\/string>/) as any)[1].split(";");

        if (!allowedComponents.includes(componentBuild)) {
            throw new Error("LicenseError: The current profile does not own building of " + component);
        }

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
        /* There are 7 Files we need to create:
            * a. build.bff
            * b. macros.json
            * c. preferences.json
            * d. steam_options.yy (json)
            * e. targetoptions.json
            * f. MainOptions.json
            * g. PlatformOptions.json
            */
    
        emitter.emit("compileStatus", "Creating Build Data\n");
        // a.
        const buildMeta: IBuildMeta = {
            applicationPath: join(options.gamemakerLocation, "GameMakerStudio.exe"),
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

            "dave.tempdir": buildTempPath,
            "dave.gm_cache": "${dave.tempdir}\\GMCache",
            "dave.gm_temp": "${dave.tempdir}\\GMTemp",
            "dave.output": "${dave.tempdir}\\Output",

            "project_full_filename": "${project_dir}\\${project_name}.yyp",
            "options_dir": "${project_dir}\\options",

            "project_cache_directory_name": "GMCache",
            "asset_compiler_cache_directory": "${dave.tempdir}",

            "project_dir_inherited_BaseProject": "${runtimeLocation}\\BaseProject",
            "project_full_inherited_BaseProject": "${runtimeLocation}\\BaseProject\\BaseProject.yyp",
            "base_project": "${runtimeLocation}\\BaseProject\\BaseProject.yyp",
            "base_options_dir": "${runtimeLocation}\\BaseProject\\options",

            "local_directory": "${ApplicationData}\\${program_dir_name}",
            "local_cache_directory": "${local_directory}\\Cache",
            "temp_directory": "${dave.gm_temp}",

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
        await fse.writeFile(join(buildTempPath, "macros.json"), JSON.stringify(macros));

        // c.
        const preferences: IBuildPreferences = {
            default_packaging_choice: 2,
            visual_studio_path: await readLocalSetting("machine.Platform Settings.Windows.visual_studio_path"),
        };
        await fse.writeFile(join(buildTempPath, "preferences.json"), JSON.stringify(preferences));

        // d.
        const steamOptions: IBuildSteamOptions = {
            steamsdk_path: await readLocalSetting("machine.Platform Settings.Steam.steamsdk_path"),
        };
        await fse.writeFile(join(buildTempPath, "steam_options.yy"), JSON.stringify(steamOptions));
    
        // e.
        const targetoptions: IBuildTargetOptions = {
            runtime: options.yyc ? "YYC" : "VM",
        };
        await fse.writeFile(join(buildTempPath, "targetoptions.json"), JSON.stringify(targetoptions));
    
        // f.
        await inheritYYFile(join(projectDir, "options/main/inherited/options_main.inherited.yy"),
            join(runtimeLocation, "/BaseProject/options/main/options_main.yy"),
            join(buildTempPath, "GMCache/MainOptions.json"));

        // g
        // Issue #1: This will fail if options/windows/options_windows.yy does not exist.
        await fse.copy(join(projectDir, "options/windows/options_windows.yy"), join(buildTempPath, "GMCache/PlatformOptions.json"));

        emitter.emit("compileStatus", "Running IGOR\n");
        const exportType = options.build == "test" ? "Run" : (options.build === "zip" ? "PackageZip" : "PackageNsis")
        const igorArgs = ["-options=" + join(buildTempPath, "build.bff"), "--", "Windows", exportType];
        const igor = spawn(join(runtimeLocation, "bin", "Igor.exe"), igorArgs);
    
        const lanchingGame = options.build == "test";
        let igorState: "igor" | "game" = "igor";

        igor.stdout.on('data', (data: Buffer) => {
            if (lanchingGame && data.toString().includes("Runner.exe  -game")) {
                emitter.emit("compileFinished");
                emitter.emit("gameStarted");
                igorState = "game";
            }
            if (igorState == "igor") {
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
                emitter.emit("compileFinished");
            } else {
                emitter.emit("gameFinished");
            }
            if (code !== 0) {
                throw new Error("IGOR Failed. Check compile log");
            }
            await fse.remove(buildTempPath);

            emitter.emit("allFinished");
        });
    }
    // Run later
    setTimeout(() => {
        asyncRun().catch(error => {
            emitter.emit("error", error)
        });
    }, 0);
    return emitter;
}