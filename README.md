# Rubber
Wrapper for IGOR.exe, aka compile gamemaker projects via command line.

This tool is called from the command line, takes in a yyz/yyp and output a zip, installer,
or just run the game. For now, this only runs on windows, compiling to windows. Alternativly
there is an api that you can call from javascript.

Maintained by: ImDaveead

## Notes
I would like some of these untested features to be confirmed to work or fail, so that it can be resolved.

- ~~Project using shaders might not work~~ **Works**
- Using steam is not tested
- Running on mac not supported.
- Using configurations not tested

## Setup

You will need installed
1. GameMaker Studio 2 Desktop (inside default install directory).
1. Node.js with npm installed.

To install rubber globally, run `npm i -g gamemaker-rubber`, and you should be all good.

To use rubber as a dependency, you would use `npm i gamemaker-rubber`

## Usage
`rubber [options] path/to/project.yyp [output file]`

**Options**:
  -Z, --zip              Creates a zip archive
  -I, --installer        Creates a installer package
  -y, --yyc              Compiles with YYC
  -c, --config STRING    Sets the configuration
  -v, --version          Display the current version
  -h, --help             Display help and usage details

## Examples
- `rubber project_folder` Launch the yyp file in `%cd%/project_folder` as if you pressed F5 in gamemaker
- `rubber .` Launch the yyp file in the current folder as if you pressed F5 in gamemaker
- `rubber --yyc --zip .` Compile the yyp file in the current folder to a zip file with yyc
- `rubber --yyc --zip project.yyp` Compile `%cd%/project.yyp` in the current folder to a zip file with yyc
- `rubber --yyc -I project.yyp` Compile `%cd%/project.yyp` in the current folder to an installer with yyc
