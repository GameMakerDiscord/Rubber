import * as cli from "cli";
import { default as chalk } from "chalk";
import { readFileSync, existsSync, statSync, readdirSync, PathLike } from "fs";
import { join, resolve } from "path";
import * as rubber from './rubber';
cli.setUsage("rubber [options] path/to/project.yyp [output file]");

/**
 * Preform basic checks to see if a .yyp is actually valid.
 */
function validateYYP(path: PathLike) {
    let projectRead;
    try {
        projectRead = JSON.parse(readFileSync(path).toString());
    } catch (e) {
        projectRead = {};
    }
    return ("IsDnDProject" in projectRead) &&
        ("id" in projectRead) &&
        ("mvc" in projectRead) &&
        ("resources" in projectRead) &&
        (projectRead.modelName === "GMProject");
}

const options = cli.parse({
    zip: ["Z", "Creates a zip archive"],
    installer: ["I", "Creates a installer package"],
    yyc: ["y", "Compiles with YYC"],
    config: ["c", "Sets the configuration", "string"],
    version: ["v", "Display the current version"],
});
cli.main((args, options) => {
    if (options.version) {
        // Output version and if build tools are all set.
        const packagejson = JSON.parse(readFileSync(join(__dirname, "../package.json")).toString());
        console.log(`Rubber ` + chalk.green(`v${packagejson.version}`));
        return;
    }
    if (args.length == 0) {
        cli.fatal("Missing project path. Exiting");
    }
    let path = resolve(args[0]);
    if (statSync(path).isDirectory()) {
        // Check inside the directory
        for (const name of readdirSync(path)) {
            if (!statSync(join(path, name)).isDirectory()) {
                if (validateYYP(join(path, name))) {
                    path = join(path, name);
                    break;
                }
            }
        }
    }
    if (!existsSync(path)) {
        cli.fatal("Project does not exist at " + chalk.yellow(path) + ". Exiting");
        return;
    }

    // Preform some checks to the project.
    
    if (!validateYYP(path)) {
        cli.fatal("Project invalid, or in a newer format. Exiting");
    }

    // We have a probably valid project. Time to pass it to rubber
    let buildType: "test" | "zip" | "installer" = "test";
    if (options.zip && options.installer) {
        // why did you even?
        cli.fatal("Cannot make a zip and installer :). Use two different cli calls. Exiting")
    }
    if (options.zip) {
        buildType = "zip";
    }
    if (options.installer) {
        buildType = "installer";
    }
    const build = rubber.windows({
        projectPath: path,
        build: buildType,
        outputPath: args[1] || "",
        yyc: options.yyc,
        config: options.config || "default",
        verbose: options.debug
    });
    build.on("compileStatus", (data) => {
        process.stdout.write(data);
    });
    build.on("gameStatus", (data) => {
        process.stdout.write(data);
    });
    build.on("gameStarted", () => {
        // space it out a bit
        console.log("\n");
    });
    build.on("allFinished", () => {
        console.log(chalk.green("Compile Finished"));
    });
});