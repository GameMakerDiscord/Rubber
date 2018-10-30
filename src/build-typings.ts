// Handles typing for build files

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
    /** Taken from local_settings.json, unused by IGOR? */
    default_packaging_choice: number;
    /** Location of Visual Studio's vcvars32.bat */
    visual_studio_path: string;
}

export interface IBuildTargetOptions {
    /** Config for host device/remote client*/
    runtime: "VM" | "YYC";
    displayname: string;
    hostname: string;
    username: string;
    encrypted_password: string;
    install_dir: string;
    target_ip: string;
    productType: string;
    version: string;
    device: string;
    type: string;
    hostmac: string;
    deviceIP: string;
    status: string;
}
// not 100% accurate but whatever.
export interface IWindowsOptions {
    id: string,
    modelName: "GMWindowsOptions",
    mvc: "1.0",
    name: "Windows",
    option_windows_allow_fullscreen_switching: boolean,
    option_windows_borderless: boolean,
    option_windows_company_info: string,
    option_windows_copy_exe_to_dest: boolean,
    option_windows_copyright_info: string,
    option_windows_description_info: string,
    option_windows_display_cursor: boolean,
    option_windows_display_name: string,
    option_windows_enable_steam: false,
    option_windows_executable_name: string,
    option_windows_icon: string,
    option_windows_installer_finished: string,
    option_windows_installer_header: string,
    option_windows_interpolate_pixels: false,
    option_windows_license: string,
    option_windows_nsis_file: string,
    option_windows_product_info: string,
    option_windows_resize_window: boolean,
    option_windows_save_location: number,
    option_windows_scale: number,
    option_windows_sleep_margin: number,
    option_windows_splash_screen: string,
    option_windows_start_fullscreen: boolean,
    option_windows_texture_page: string,
    option_windows_use_splash: false,
    option_windows_version: {
        build: number,
        major: number,
        minor: number,
        revision: number
    },
    option_windows_vsync: boolean
}