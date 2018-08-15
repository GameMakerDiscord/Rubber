import * as fse from "fs-extra";
import { PathLike } from "fs-extra";

const CONTROL_INSERT_START_ID = "←"; // uh
const CONTROL_INSERT_END_ID = "|";

/**
 * Attemps to inherit a .yy json file with a parent and child file
 */
export async function inheritYYFile(childPath: PathLike, parentPath: PathLike, outputPath: PathLike) {
    type IChangeList = Array<{ id: string, changes: { [key: string]: any } }>;

    const parent: object = JSON.parse((await fse.readFileSync(parentPath)).toString());
    const inherited = (await fse.readFileSync(childPath)).toString();

    let insId = "";
    let insContent = "";
    let insState = "SEEK";

    const changes: IChangeList = [];

    for (let i = 0; i < inherited.length; i++) {
        let char = inherited.charAt(i);
        switch (insState) {
            case "SEEK":
                insId = "";
                insContent = "";
                if (char === CONTROL_INSERT_START_ID) {
                    insState = "READ_ID";
                }
                break;
            case "READ_ID":
                if (char !== CONTROL_INSERT_END_ID) {
                    insId += char;
                    if (char === CONTROL_INSERT_START_ID) {
                        insId = "";
                        insContent = "";
                    }
                } else {
                    insState = "none";
                    // Get the JSON string. Find the string between {}
                    let brackedCount = 1;
                    i += 2;
                    while (brackedCount !== 0) {
                        char = inherited.charAt(i);
                        insContent += char;
                        if (char === "{") {
                            brackedCount++;
                        } else if (char === "}") {
                            brackedCount--;
                        }
                        i++;
                    }
                    i -= 2;
                    insState = "SEEK";
                    changes.push({ id: insId, changes: JSON.parse("{" + insContent) });
                }
                break;
        }
    }
    // recursive function for doing combine the parent object with the array
    const combine = (object: any, changeList: IChangeList) => {
        for (const attributename in object) {
            if (attributename in object) {
                const item = object[attributename];
                if (typeof item === "object") {
                    object[attributename] = combine(item, changeList);
                }
            }
        }
        if (object) {
            for (const change of changeList) {
                if (object.id === change.id) {
                    Object.assign(object, change.changes);
                }
            }
        }
        return object;
    };
    await fse.writeFile(outputPath as any, JSON.stringify(combine(parent, changes), undefined, 2));
}
