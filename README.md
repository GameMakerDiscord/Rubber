# Rubber
Wrapper for IGOR.exe, aka compile gamemaker projects via command line.

This tool is called from the command line, takes in a yyz/yyp and output a zip, installer,
or just run the game. For now, this only runs on windows, compiling to windows. Alternativly
there is an api that you can call from javascript. Running this program requires that you have
a valid GameMaker Studio 2 installation and have purchased the selected module (you cannot compile
to Windows if you only own HTML Exporting)

Maintained by: [dave caruso](https://github.com/davecaruso)

## Notes
I would like some of these untested features to be confirmed to work or fail, so that it can be resolved.

- ~~Project using shaders might not work~~ **Works**
- Using steam is not tested
- Running on mac not supported.
- Using configurations not tested

## Setup

You will need installed
1. GameMaker Studio 2 Desktop (inside it's default install directory).
1. Node.js with npm installed.

To install rubber globally, run `npm i -g gamemaker-rubber`, and you should be all good.

To use rubber as a dependency, you would use `npm i gamemaker-rubber`

## Usage
`rubber [options] path/to/project.yyp [output file]`

**Options**

| Option          | Actions                        |
| --------------- | ------------------------------ |
| -Z, --zip       | Creates a zip archive          |
| -I, --installer | Creates a installer package    |
| -y, --yyc       | Compiles with YYC              |
| -v, --version   | Display the current version    |
| -c, --config    | Sets the configuration         |
| -h, --help      | Display help and usage details |

## Examples
- `rubber project_folder` Launch the yyp file in `%cd%/project_folder` as if you pressed F5 in gamemaker
- `rubber .` Launch the yyp file in the current folder as if you pressed F5 in gamemaker
- `rubber --yyc --zip .` Compile the yyp file in the current folder to a zip file with yyc
- `rubber --yyc --zip project.yyp` Compile `%cd%/project.yyp` in the current folder to a zip file with yyc
- `rubber --yyc -I project.yyp` Compile `%cd%/project.yyp` in the current folder to an installer with yyc


## Nodejs API Usage
To use Rubber as a dependency, install it to your project with `npm i gamemaker-rubber`, it includes
type definitions.

### Basic Compile
```js
const build = rubber.windows({
    projectPath: "path/to/game.yyp",
    build: "run"
});
build.on("compileStatus", (data) => {
    process.stdout.write(data);
});
build.on("gameStatus", (data) => {
    process.stdout.write(data);
});
build.on("allFinished", () => {
    console.log("Compile Finished");
});
```
Rubber uses an asyncronous EventEmitter to give out status updates, so you can listen to certain
events, but not others, and use it to stream the entire output of IGOR (the compiler) to somewhere
like the standard output (shown above).

### Events
#### compileStarted
Emitted when the compile process starts

#### compileFinished
Emitted when the **compile process is finished, the game might be launched at this point**. Sends an array of
all errors in the compile process.

#### compileStatus
Emitted with a `data` paramater, containing a string of output data. When displaying this data
do not manually add a newline (console.log does it)

#### gameStarted
Emitted when the game starts, not always emitted.

#### gameStatus
Emitted with a `data` paramater, containing a string of output data from the game process.

#### gameFinished
Emitted when the game closes, not always emitted.

#### allFinished
Emitted when everything is finished, always emitted at the end. Sends an array of
all errors in the compile process, exactly the same array as from the compileFinished message.

#### rawStdout
Emitted with a `data` paramater, containing a chunk of raw output data from IGOR.

#### error
Emitted when some kind of error happens.
