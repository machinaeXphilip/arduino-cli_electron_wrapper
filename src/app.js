import "./stylesheets/main.css";

// Small helpers you might want to keep
import "./helpers/context_menu.js";
import "./helpers/external_links.js";

// ----------------------------------------------------------------------------
// 
// ----------------------------------------------------------------------------

import { remote } from "electron";
import jetpack from "fs-jetpack";

import env from "env";

const util = require('util');
const exec = util.promisify(require('child_process').exec); // to trigger cli and bash

const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());

const manifest = appDir.read("package.json", "json");

const osMap = {
  win32: "Windows",
  darwin: "macOS",
  linux: "Linux"
};

const fs = require('fs');

document.querySelector("#app").style.display = "block";

document.querySelector("#os").innerHTML = osMap[process.platform];
document.querySelector("#env").innerHTML = env.name;

document.getElementById("flash").addEventListener("click",main);


var basepath = app.getAppPath();
console.log(basepath);
basepath = basepath+"/app";
console.log(basepath);

///// INIT ////
// inits arduino-cli, installs (if necessary) the cores needed

document.getElementById("app").style.display = 'none'; // hide app
document.getElementById("status").innerHTML = "checking if files need download..."

exec(basepath+"/arduino-cli config init --config-file "+basepath+"/arduino-cli.yaml")
.then((res)=>{
  console.log(res);
  return exec(basepath+"/arduino-cli core update-index --config-file "+basepath+"/arduino-cli.yaml") // can i do that locally / offline?
})
.then((res)=>{
  console.log(res.stdout);
  document.getElementById("status").innerHTML = "downloading esp8266 core files..."
  return exec(basepath+"/arduino-cli core install esp8266:esp8266 --config-file "+basepath+"/arduino-cli.yaml")  // can i do that locally / offline?
})
.then((res)=>{
  console.log(res.stdout);
  console.log("esp8266 core installed");
  document.getElementById("app").style.display = 'block';
  document.getElementById("status").innerHTML = "ready to flash"
})
.catch((err)=>{
  console.log("error:",err);
  document.getElementById("app").style.display = 'block';
  document.getElementById("status").innerHTML = "";

  if (err.toString().includes("arduino-cli core update-index")){
    document.getElementById("status").innerHTML = 
    "you are offline.<br>if everything was installed the first time, no problemo." +
    "<br> otherwise, please go online and restart"
  }
})


function changeLine(original,lineToChange,contentOfLine)
{
  let lineByline = original.split("\n");
  console.log(lineByline);
  lineByline[lineToChange] = contentOfLine;
  return lineByline.join("\n")
}

/// MAIN ////

async function main()
{
  console.log(basepath);
  let ls = await exec("ls "+basepath);
  if (ls.stderr){return stderr}
  console.log(ls.stdout);
 
  document.getElementById("status").innerHTML = "preparing file ..."
  // STEP 0
  // get userinputs and change arduino Code of MyFirstSketch accordingly
  let blinkInterval = document.getElementById("blinkInterval").value;
  blinkInterval = Number(blinkInterval);
  if (isNaN(blinkInterval) || blinkInterval <= 10 || !blinkInterval ){
    blinkInterval = 500;
    document.getElementById("blinkInterval").value = 500;
  }
  //get template file
  let template = fs.readFileSync(basepath+"/MyFirstSketch/MyFirstSketch.ino");
  console.log(template.toString());
  template = template.toString();
  let newFileContent = changeLine(template,6,"  delay("+blinkInterval+");");
  newFileContent = changeLine(newFileContent,8,"  delay("+blinkInterval+");");
  console.log(newFileContent)
  //change file
  fs.writeFileSync(basepath+"/MyFirstSketchModified/MyFirstSketchModified.ino", newFileContent); 


  // STEP 1
  // get list of Boards connected via SerialPorts:
  document.getElementById("status").innerHTML = "checking for boards ...";

  let boardList = await exec(""+basepath+"/arduino-cli board list --config-file "+basepath+"/arduino-cli.yaml");
  if (boardList.stderr){return boardList.stderr}
  // convert and show the output.
  boardList = boardList.stdout;
  console.log(boardList);


  // STEP 2
  // look through list of board to find USBSerialPort
    
  let lineByline = boardList.split("\n");
  console.log(lineByline);

  let pathToUSBSerial = null;
  for (let i=0; i < lineByline.length; i++)
  {
    if (lineByline[i].includes("wchusbserial")) // on MACOS that seems to be the only way to identify a connected ESP.
    {

      pathToUSBSerial = lineByline[i].split(" ")[0];
      console.log("found at:",pathToUSBSerial);
    }
  }

  if (!pathToUSBSerial)
  {
    console.log("not found. inform user!!!")
    document.getElementById("status").innerHTML = "please connect WEMOS/LOLIN D1 mini"
    return
  }

  document.getElementById("status").innerHTML = pathToUSBSerial + "<br> compiling...";

  // STEP 3
  // install example sketch to Arduino:
  
  // compile
  let compiled = await exec(`${basepath}/arduino-cli compile --fqbn esp8266:esp8266:d1_mini ${basepath}/MyFirstSketchModified --config-file ${basepath}/arduino-cli.yaml`);
  if(compiled.stderr){return compiled.stderr}
  compiled = compiled.stdout;
  console.log(compiled);

  document.getElementById("status").innerHTML = pathToUSBSerial + "<br> uploading...";
  // upload

  let upload = await exec(`${basepath}/arduino-cli upload -p ${pathToUSBSerial} --fqbn esp8266:esp8266:d1_mini ${basepath}/MyFirstSketchModified --config-file ${basepath}/arduino-cli.yaml`);
  if (upload.stderr){return upload.stderr}
  document.getElementById("status").innerHTML = pathToUSBSerial + "<br> done.";
   
}

