// TODO: Make Sure AppData Exists.
// TODO: path.join()
import * as fse from "fs-extra";
import { join } from "path";

/**
 * Typings for the preferences file found at
 * AppData/GameMakerStudio2/name_123456/local_settings.json
 */
export interface ILocalSettings {
    [option: string]: string;
}

let cache: ILocalSettings;

/**
 * Returns the gamemaker user preferences JSON Object of the current user. This
 * value is cached. This can be used to get their Visual Studio Location
 */
export async function readLocalSetting(key: string, def: string = ""): Promise<string> {
    if (!cache) {
        // The UM file contains the user's id number.
        const um = JSON.parse((await fse.readFile(`${process.env.APPDATA}\\GameMakerStudio2\\um.json`)).toString());
        const userFolder = um.username.substring(0, um.username.indexOf("@")) + "_" + um.userID;
        const preferencesLocation = `${process.env.APPDATA}\\GameMakerStudio2\\` + userFolder + `\\local_settings.json`;
        cache = JSON.parse((await fse.readFile(preferencesLocation)).toString());
    }
    return cache[key] || def;
}
export async function getUserDir() {
    const um = JSON.parse((await fse.readFile(`${process.env.APPDATA}\\GameMakerStudio2\\um.json`)).toString());
    const userFolder = um.username.substring(0, um.username.indexOf("@")) + "_" + um.userID;
    return join(`${process.env.APPDATA}`, "GameMakerStudio2", userFolder);
}
