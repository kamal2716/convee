const { app, BrowserWindow, ipcMain, dialog, shell, Menu, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const chokidar=require('chokidar');
const sharp=require('sharp');
const { convertFile, getFormats, engineStatus, pdfOperation } = require('./converter');
const { findDuplicates } = require('./features/duplicate-finder');
const { inspectImage, exportWithoutMetadata } = require('./features/image-privacy');
const watchers=new Map();let overlayHistoryQueue=Promise.resolve();
const watchConfigPath=()=>path.join(app.getPath('userData'),'watch-folders.json');
async function readWatchConfigs(){try{return JSON.parse(await fs.readFile(watchConfigPath(),'utf8'))}catch{return []}}
async function writeWatchConfigs(items){await fs.mkdir(path.dirname(watchConfigPath()),{recursive:true});await fs.writeFile(watchConfigPath(),JSON.stringify(items,null,2))}
function startFolderWatcher(cfg){const id=cfg.id||cfg.folder;if(watchers.has(id))watchers.get(id).close();const watcher=chokidar.watch(cfg.folder,{ignoreInitial:true,awaitWriteFinish:{stabilityThreshold:1200,pollInterval:150},ignored:p=>p.includes('.convee-')||p.includes('-converted.')});watcher.on('add',async file=>{if(!cfg.format||path.extname(file).slice(1).toLowerCase()===cfg.format)return;try{await convertFile({input:file,format:cfg.format,outputDir:cfg.outputDir||cfg.folder})}catch(err){console.warn('Watch conversion:',err.message)}});watchers.set(id,watcher);return id}

let win, overlay, hook, modifierDown=false, mouseDown=false, isQuitting=false;
const modifierCodes=process.platform==='darwin'?[56,3640]:[29,3613];
const isModifier=code=>modifierCodes.includes(code);
const isWin=process.platform==='win32';
function hasTool(name){const cmd=isWin?'where':process.platform==='darwin'?'which':'which';return spawnSync(cmd,[name],{stdio:'ignore'}).status===0}
function createWindow(){
 win=new BrowserWindow({width:1180,height:820,minWidth:850,minHeight:620,backgroundColor:'#080a0f',title:'convee',titleBarStyle:process.platform==='darwin'?'hiddenInset':'default',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.loadFile(path.join(__dirname,'index.html'));
 win.on('close',event=>{if(!isQuitting){event.preventDefault();win.minimize()}});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'File',submenu:[{label:'Open Downloads',click:()=>shell.openPath(app.getPath('downloads'))},{type:'separator'},{label:'Quit Convee',click:()=>app.quit()}]},{label:'Edit',submenu:[{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'View',submenu:[{role:'reload'},{role:'toggleDevTools'},{type:'separator'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]}]));
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
  if(hook){hook.start();return true}
  const {uIOhook}=require('uiohook-napi');
  hook=uIOhook;
  hook.on('keydown',e=>{if(isModifier(e.keycode))modifierDown=true;});
  hook.on('keyup',e=>{if(isModifier(e.keycode)){modifierDown=false;if(!mouseDown)hideOverlay()}});
  hook.on('mousedown',e=>{if(e.button===1){mouseDown=true;if(modifierDown)showOverlay()}});
  hook.on('mouseup',e=>{if(e.button===1){mouseDown=false;if(!modifierDown)hideOverlay()}});
  hook.on('mousemove',e=>{if(modifierDown&&mouseDown&&overlay&&!overlay.isDestroyed()&&overlay.isVisible())overlay.setPosition(Math.max(0,e.x-180),Math.max(0,e.y-180),false)});
  hook.start();return true;
 }catch(err){console.warn('Global drag hook unavailable:',err.message);return false}
}
function stopGlobalHook(){try{hook?.stop()}catch{}hideOverlay()}
async function readPreferences(){try{return JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'preferences.json'),'utf8'))}catch{return {}}}
app.whenReady().then(async()=>{
 ipcMain.handle('files:choose',chooseFiles);
 ipcMain.handle('image:choose',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'Images',extensions:['png','jpg','jpeg','webp','avif','tiff','bmp','gif']}],properties:['openFile']});return r.canceled?null:r.filePaths[0]});
 ipcMain.handle('image:preview',async(_,file)=>{const data=await sharp(file).rotate().resize({width:1400,height:1000,fit:'inside',withoutEnlargement:true}).jpeg({quality:86}).toBuffer();return 'data:image/jpeg;base64,'+data.toString('base64')});
 ipcMain.handle('pdf:choose',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'PDF files',extensions:['pdf']}],properties:['openFile','multiSelections']});return r.canceled?[]:r.filePaths});
 ipcMain.handle('folder:choose',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory']});return r.canceled?null:r.filePaths[0]});
 ipcMain.handle('preferences:load',async()=>{try{return JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'preferences.json'),'utf8'))}catch{return {}}});
 ipcMain.handle('gesture:get',async()=>Boolean((await readPreferences()).gestureEnabled));
 ipcMain.handle('gesture:set',async(_,enabled)=>{const p=await readPreferences();p.gestureEnabled=Boolean(enabled);const file=path.join(app.getPath('userData'),'preferences.json');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(p,null,2));if(p.gestureEnabled){if(!overlay||overlay.isDestroyed())createOverlay();startGlobalHook()}else stopGlobalHook();return p.gestureEnabled});
 ipcMain.handle('startup:get',()=>Boolean(app.getLoginItemSettings().openAtLogin));
 ipcMain.handle('startup:set',(_,enabled)=>{app.setLoginItemSettings({openAtLogin:Boolean(enabled),path:process.execPath});return Boolean(enabled)});
 ipcMain.handle('preferences:save',async(_,settings)=>{const file=path.join(app.getPath('userData'),'preferences.json');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(settings,null,2));if(overlay&&!overlay.isDestroyed())overlay.webContents.send('preferences:changed',settings);return true});
 ipcMain.handle('history:load',async()=>{try{return JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'history.json'),'utf8'))}catch{return []}});
 ipcMain.handle('history:save',async(_,items)=>{const file=path.join(app.getPath('userData'),'history.json');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(items.slice(0,100),null,2));return true});
 ipcMain.handle('files:inspect',async(_,paths)=>Promise.all(paths.map(async p=>{const s=await fs.stat(p);return{path:p,name:path.basename(p),size:s.size,ext:path.extname(p).slice(1).toLowerCase()}})));
 ipcMain.handle('duplicates:scan',async(_,folder)=>findDuplicates(folder));
 ipcMain.handle('image:metadata',async(_,file)=>inspectImage(file));
 ipcMain.handle('image:strip-metadata',async(_,file)=>exportWithoutMetadata(file));
 ipcMain.handle('formats:list',(_,ext)=>getFormats(ext));
 ipcMain.handle('engines:status',()=>engineStatus());
 ipcMain.handle('files:convert',async(_,payload)=>convertFile(payload));
 ipcMain.handle('files:convert-from-overlay',async(_,payload)=>{
  const result=await convertFile(payload);
  overlayHistoryQueue=overlayHistoryQueue.then(async()=>{
   const historyFile=path.join(app.getPath('userData'),'history.json');let items=[];
   try{items=JSON.parse(await fs.readFile(historyFile,'utf8'))}catch{}
   items.unshift({name:path.basename(payload.input),output:result.output,format:String(payload.format).toUpperCase(),date:new Date().toLocaleString()});
   items=items.slice(0,100);await fs.mkdir(path.dirname(historyFile),{recursive:true});await fs.writeFile(historyFile,JSON.stringify(items,null,2));
   if(win&&!win.isDestroyed())win.webContents.send('history:updated',items);
  });
  await overlayHistoryQueue;return result;
 });
 ipcMain.handle('app:notify',(_,message)=>{const {Notification}=require('electron');if(Notification.isSupported())new Notification({title:String(message?.title||'Convee'),body:String(message?.body||'Your file is ready')}).show();return true});
 ipcMain.handle('pdf:operate',async(_,payload)=>pdfOperation(payload));
 ipcMain.handle('watch:list',async()=>readWatchConfigs());
 ipcMain.handle('watch:add',async(_,cfg)=>{const id=cfg.id||cfg.folder;const items=(await readWatchConfigs()).filter(x=>x.id!==id);const saved={...cfg,id};items.push(saved);await writeWatchConfigs(items);startFolderWatcher(saved);return id});
 ipcMain.handle('watch:remove',async(_,id)=>{await watchers.get(id)?.close();watchers.delete(id);await writeWatchConfigs((await readWatchConfigs()).filter(x=>x.id!==id));return true});
 ipcMain.handle('files:reveal',(_,p)=>shell.showItemInFolder(p));
 ipcMain.handle('files:open',(_,p)=>shell.openPath(p));
 ipcMain.on('overlay:dropped',(_,paths)=>{hideOverlay();if(win){win.show();win.focus();win.webContents.send('files:chosen',paths)}});
 ipcMain.on('overlay:convert',async(_,payload)=>{try{const result=await convertFile(payload);if(win)win.webContents.send('overlay:result',{ok:true,...result});hideOverlay()}catch(e){if(win)win.webContents.send('overlay:result',{ok:false,error:e.message});}});
 ipcMain.on('overlay:close',hideOverlay);
 for(const cfg of await readWatchConfigs()){try{startFolderWatcher(cfg)}catch(err){console.warn('Could not restore watch folder:',err.message)}}
 createWindow();createOverlay();if((await readPreferences()).gestureEnabled)startGlobalHook();
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
});
app.on('before-quit',()=>{isQuitting=true});
app.on('will-quit',()=>{try{hook?.stop()}catch{}for(const w of watchers.values())w.close();watchers.clear()});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
