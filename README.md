# Arduino Command Line Interace Electron wrapped

This app wraps the Arduino Command Line Interface (Arduino CLI) (https://github.com/machinaeXphilip/arduino-cli_electron_wrapper) inside a HTML nodejs Application with User Interface.

The goal of this project is to be used as a template to build custom flashing tools: 

After receiving user input, this app uses an Arduino Code Template, modifies the Arduino Code with the data provided by the user interface, then compiles and upload Arduino Code to specific modules if they are connected via USB.

This Project was build with the Electron Framework (https://electronjs.org/). It is also based on the Electron boilerplate from https://github.com/szwacz/electron-boilerplate.git with slight modifications (see below).

# Disclaimer / Platform compatibility

At the moment the included arduino-cli binary works only for MacOS although Electron can be easily built for Linux and Windows as well. I hope to add other platforms into the pipeline in the future and am happy about any help there.
This is a very rough proof-of-concept in dire need of more abstractions and a more solid build pipeline.

# Quick start

Make sure you have [Node.js](https://nodejs.org) installed, git clone this repository, cd into it, then type
```
npm install
npm start
```
...and you have a running desktop application on your screen.

Then connect a WEMOS / LOLIN D1 mini board via USB to your Computer, type some number into the textinput "blinkInterval" in the User Interface and click the button "INSTALL FIRMWARE TO ARDUINO"

# app flow

The App will attempt to use the UserInput to modify two lines (7 and 8) in the Arduino Template Code `/app/MyFirstSketch/MyFirstSketch.ino` by utiizing `changeLine()` and writes the modified Arduino Code into `/app/MyFirstSketchModified/MyFirstSketchModified.ino`.

After that, the app searches for connected WEMOS / LOLIN D1 mini boards by looking for the first Serial Port including `wchusbserial` in its name (tested only on MacOS so far).

If found, it will use the binary of the arduino-cli `/app/arduino-cli` and its config file `/app/arduino-cli.yaml` to update the arduino core index, install (if necessary and possible) the ESP8266 core, compile and upload the modified .ino Code the WEMOS / LOLIN D1 mini board.

( In order for that to work, I needed to download and update the core libraries within the arduino-cli binary. If you use libraries or other cores, you might have to do that following the instructions at https://github.com/arduino/arduino-cli#step-4-find-and-install-the-right-core before packing it into this app )

In this example you should be able to modify the blink Interval of the connected WEMOS / LOLIN D1 minis on board LED.


# changes from original electron boilerplate by szwacz

- npm command "release" originally included `npm test &&` before the actual release triggers inside package.json but has been removed.
  this should not be a problem. if you want to include your own tests, check the original boilerplate or just include your own testing logic based on "npm test" command specified inside package.json. If you don't understand what this text is talking about: no worries. Just go ahead. 
- the npm commands "preunit","unit","pree2e","e2e","test" are all still defined inside package.json but wont work until proper test scripts (see below) are provided. you will most likely only need `npm run start` and `npm run release`. 


# Structure of the project

The application consists of two main folders...

`src` - files within this folder get transpiled or compiled (because Electron can't use them directly).

`app` - contains all static assets which don't need any pre-processing. Put here images, CSSes, HTMLs, etc.

The build process compiles the content of the `src` folder and puts it into the `app` folder, so after the build has finished, your `app` folder contains the full, runnable application.

Treat `src` and `app` folders like two halves of one bigger thing.

The drawback of this design is that `app` folder contains some files which should be git-ignored and some which shouldn't (see `.gitignore` file). But this two-folders split makes development builds much, much faster.

For the arduino wrapper I downloaded and installed the arduino-cli binary for MacOS and added it to `app`. 
(TODO: include a platform specific install of the arduino-cli into the build pipeline)

`arduino-cli.yaml`, the config file for the arduino-cli, is found in `src` and will get copied into `app` on every build. This is because the arduino-cli will modify the config file on every `$ ./arduino-cli config init` and we want a clean untouched config file before shipping the app.

# Development

The following is taken mainly from the Readme of https://github.com/szwacz/electron-boilerplate.git and explains the basics of the boilerplate rather than the Arduino Wrapper.

## Starting the app

```
npm start
```


# important for adapting from other electron apps

there are a couple of mighty but confusing features inside this boilerplate.

## app / src and entry points for webpack and electron


if you build them fresh: just now that `src/background.js` is the main process and the renderer process in the boilerplate is based on /src/app.js but will be transpiled into /app/app.js where it can be referenced by the .html.

if we know that the renderer is to be static, it can be already put into /app as .js linked from the html file, but then we have to comment out the transpiling config from `/build/webpack.app.config.json` like follows:

```js
const path = require("path");
const merge = require("webpack-merge");
const base = require("./webpack.base.config");

module.exports = env => {
  return merge(base(env), {
    entry: {
      background: "./src/background.js",
      //app: "./src/app.js"
    },
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "../app")
    }
  });
};
```

entry points have to be defined inside of `/build/webpack.app.config.json` and inside of package.json



## The build pipeline

Build process uses [Webpack](https://webpack.js.org/). The entry-points are `src/background.js` and `src/app.js`. Webpack will follow all `import` statements starting from those files and compile code of the whole dependency tree into one `.js` file for each entry point.

[Babel](http://babeljs.io/) is also utilised, but mainly for its great error messages. Electron under the hood runs latest Chromium, hence most of the new JavaScript features are already natively supported.

## Environments

Environmental variables are done in a bit different way (not via `process.env`). Env files are plain JSONs in `config` directory, and build process dynamically links one of them as an `env` module. You can import it wherever in code you need access to the environment.
```js
import env from "env";
console.log(env.name);
```

## Upgrading Electron version

To do so edit `package.json`:
```json
"devDependencies": {
  "electron": "2.0.2"
}
```
*Side note:* [Electron authors recommend](http://electron.atom.io/docs/tutorial/electron-versioning/) to use fixed version here.

## Adding npm modules to your app

Remember to respect the split between `dependencies` and `devDependencies` in `package.json` file. Your distributable app will contain modules listed in `dependencies` after running the release script.

*Side note:* If the module you want to use in your app is a native one (not pure JavaScript but compiled binary) you should first  run `npm install name_of_npm_module` and then `npm run postinstall` to rebuild the module for Electron. You need to do this once after you're first time installing the module. Later on, the postinstall script will fire automatically with every `npm install`.

# Making a release

To package your app into an installer use command:
```
npm run release
```

Once the packaging process finished, the `dist` directory will contain your distributable file.

We use [electron-builder](https://github.com/electron-userland/electron-builder) to handle the packaging process. It has a lot of [customization options](https://www.electron.build/configuration/configuration), which you can declare under `"build"` key in `package.json`.

You can package your app cross-platform from a single operating system, [electron-builder kind of supports this](https://www.electron.build/multi-platform-build), but there are limitations and asterisks. That's why this boilerplate doesn't do that by default.

## Adding your custom icons to a release

you can replace the contents of `resources/icon.icns`, `resources/icon.ico` (for MacOS) and `resources/icons/icon.png` (for Windows) to place your own icons into the packaged versions. 

A good tool for converting from png to .ico and .icns for lazy people on MacOS is: iConvert from the AppStore