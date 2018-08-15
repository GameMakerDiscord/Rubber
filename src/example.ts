import * as rubber from './rubber';

let path_to_yyp = "C:/Users/Dave/Desktop/evad/code/_archive/2017-12-17 - LGS2/LGS2.yyp";

let build = rubber.windows({
    projectPath: path_to_yyp,
    build: "test",
    outputPath: "nowhere :)",  // can be blank instead
});

build.on("compileStatus", (data) => {
    console.log("Compile Info: ", data);
});
build.on("gameStatus", (data) => {
    console.log("Game Output", data);
});
build.on("allFinished", () => {
    console.log("All Finished. :)");
});