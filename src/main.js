const { app, BrowserWindow, ipcMain, dialog, shell, Menu, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const { convertFile, getFormats, engineStatus } = require('./converter');

let win, overlay, hook, modifierDown=false, mouseDown=false;
const modifierCodes=process.platform==='darwin'?[56,3640]:[29,3613];
const isModifier=code=>modifierCodes.includes(code);
const isWin=process.platform==='win32';
function hasTool(name){const cmd=isWin?'where':process.platform==='darwin'?'which':'which';return spawnSync(cmd,[name],{stdio:'ignore'}).status===0}
function createWindow(){
 win=new BrowserWindow({width:1180,height:820,minWidth:850,minHeight:620,backgroundColor:'#080a0f',title:'convee',titleBarStyle:process.platform==='darwin'?'hiddenInset':'default',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.loadFile(path.join(__dirname,'index.html'));
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'File',submenu:[{label:'Add files…',accelerator:'CmdOrCtrl+O',click:chooseFiles},{label:'Open Downloads',click:()=>shell.openPath(app.getPath('downloads'))},{type:'separator'},{role:'quit'}]},{label:'Edit',submenu:[{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'View',submenu:[{role:'reload'},{role:'toggleDevTools'},{type:'separator'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]}]));
}
async function chooseFiles(){const r=await dialog.showOpenDialog(win,{properties:['openFile','multiSelections']});if(!r.canceled&&win)win.webContents.send('files:chosen',r.filePaths)}
function createOverlay(){
 overlay=new BrowserWindow({width:360,height:360,x:Math.round(screen.getCursorScreenPoint().x-180),y:Math.round(screen.getCursorScreenPoint().y-180),show:false,frame:false,transparent:true,hasShadow:false,resizable:false,skipTaskbar:true,alwaysOnTop:true,focusable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 overlay.setAlwaysOnTop(true,'screen-saver');overlay.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});overlay.loadFile(path.join(__dirname,'overlay.html'));
 overlay.on('closed',()=>overlay=null);
}
function showOverlay(){if(!overlay||overlay.isDestroyed())createOverlay();const p=screen.getCursorScreenPoint();overlay.setPosition(Math.max(0,p.x-180),Math.max(0,p.y-180),false);overlay.showInactive();overlay.webContents.send('overlay:state',{active:true});}
function hideOverlay(){if(overlay&&!overlay.isDestroyed()){overlay.webContents.send('overlay:state',{active:false});overlay.hide()}}
function startGlobalHook(){
 try{
  const {uIOhook}=require('uiohook-napi');
  hook=uIOhook;
  hook.on('keydown',e=>{if(isModifier(e.keycode))modifierDown=true;});
  hook.on('keyup',e=>{if(isModifier(e.keycode)){modifierDown=false;if(!mouseDown)hideOverlay()}});
  hook.on('mousedown',e=>{if(e.button===1){mouseDown=true;if(modifierDown)showOverlay()}});
  hook.on('mouseup',e=>{if(e.button===1){mouseDown=false;if(!modifierDown)hideOverlay()}});
  hook.on('mousemove',e=>{if(modifierDown&&mouseDown&&overlay&&!overlay.isDestroyed()&&overlay.isVisible())overlay.setPosition(Math.max(0,e.x-180),Math.max(0,e.y-180),false)});
  hook.start();
 }catch(err){console.warn('Global drag hook unavailable:',err.message)}
}
app.whenReady().then(()=>{
 ipcMain.handle('files:choose',chooseFiles);
 ipcMain.handle('preferences:load',async()=>{try{return JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'preferences.json'),'utf8'))}catch{return {}}});
 ipcMain.handle('preferences:save',async(_,settings)=>{const file=path.join(app.getPath('userData'),'preferences.json');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(settings,null,2));if(overlay&&!overlay.isDestroyed())overlay.webContents.send('preferences:changed',settings);return true});
 ipcMain.handle('history:load',async()=>{try{return JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'history.json'),'utf8'))}catch{return []}});
 ipcMain.handle('history:save',async(_,items)=>{const file=path.join(app.getPath('userData'),'history.json');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(items.slice(0,100),null,2));return true});
 ipcMain.handle('files:inspect',async(_,paths)=>Promise.all(paths.map(async p=>{const s=await fs.stat(p);return{path:p,name:path.basename(p),size:s.size,ext:path.extname(p).slice(1).toLowerCase()}})));
 ipcMain.handle('formats:list',(_,ext)=>getFormats(ext));
 ipcMain.handle('engines:status',()=>engineStatus());
 ipcMain.handle('files:convert',async(_,payload)=>convertFile(payload));
 ipcMain.handle('files:reveal',(_,p)=>shell.showItemInFolder(p));
 ipcMain.handle('files:open',(_,p)=>shell.openPath(p));
 ipcMain.on('overlay:dropped',(_,paths)=>{hideOverlay();if(win){win.show();win.focus();win.webContents.send('files:chosen',paths)}});
 ipcMain.on('overlay:convert',async(_,payload)=>{try{const result=await convertFile(payload);if(win)win.webContents.send('overlay:result',{ok:true,...result});hideOverlay()}catch(e){if(win)win.webContents.send('overlay:result',{ok:false,error:e.message});}});
 ipcMain.on('overlay:close',hideOverlay);
 createWindow();createOverlay();startGlobalHook();
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
});
app.on('will-quit',()=>{try{hook?.stop()}catch{}});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
