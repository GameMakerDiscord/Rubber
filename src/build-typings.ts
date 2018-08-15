export interface IRuntimeIndex {
    /** Current active runtime version selected in the IDE */
    active: string;
    [version: string]: string;
}
export interface IBuildMeta {
    /** The Configuration to compile with. */
    config: string;
    /** The Project Name. */
    projectName: string;
    /** The absolute path to your project folder */
    projectDir: string;
    /** The absolute path to your project file (inside projectDir) */
    projectPath: string;
    /** The absolute path where your export file will go, leave blank if not exporting. */
    targetFile: string;
    /** The absolute path to a temporary output folder. */
    outputFolder: string;
    /** The absolute path to a temporary folder. */
    tempFolder: string;
    /** The absolute path to a `.win` file inside outputFolder. */
    compile_output_file_name: string;
    /** The absolute path to targetoptions.json. */
    targetOptions: string;
    /** The absolute path to steam_options.yy. */
    steamOptions: string;
    /** The absolute path to macros.json. */
    macros: string;
    /** The absolute path to preferences.json. */
    preferences: string;
    /** The absolute path to your user dir located in %appdata%/GameMakerStudio2/. */
    userDir: string;
    /** The absolute path to GameMaker Studio 2's runtime. */
    runtimeLocation: string;
    /** The absolute path to GameMakerStudio.exe */
    applicationPath: string;
    /** *Possibly* change the location of the Asset Compiler, default "" (an empty string) */
    assetCompiler: string;
    /** A string being "True" or "False" if you want to use debug mode. (Note: Untested) */
    debug: string;
    /** A string being "True" or "False" if you want to use shaders. (default: True, Untested on False) */
    useShaders: string;
    /** A string being "True" or "False" enabling verbose output */
    verbose: string;
    /** Default "64", Untested */
    targetMask: string;
    /** Port for the IDE's Help HTTP Server, default "51290" */
    helpPort: string;
    /** Port for the Debugger, default "6509" */
    debuggerPort: string;
}
export interface IBuildSteamOptions {
    /** Path to the Steam SDK, as set in the IDE settings. */
    steamsdk_path: string;
}
export interface IBuildPreferences {
    /** Taken from local_settings.json, unused by IGOR */
    default_packaging_choice: number;
    /** Location of Visual Studio's vcvars32.bat */
    visual_studio_path: string;
}
export interface IBuildTargetOptions {
    runtime: "VM" | "YYC";
}