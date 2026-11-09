const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('convee',{
 chooseFiles:()=>ipcRenderer.invoke('files:choose'),
 inspect:paths=>ipcRenderer.invoke('files:inspect',paths),
 formats:ext=>ipcRenderer.invoke('formats:list',ext),
 engines:()=>ipcRenderer.invoke('engines:status'),
 convert:payload=>ipcRenderer.invoke('files:convert',payload),
 reveal:p=>ipcRenderer.invoke('files:reveal',p),open:p=>ipcRenderer.invoke('files:open',p),
 onFilesChosen:cb=>ipcRenderer.on('files:chosen',(_,p)=>cb(p)),
 onOverlayDrop:cb=>ipcRenderer.on('overlay:dropped',(_,p)=>cb(p)),
 onOverlayResult:cb=>ipcRenderer.on('overlay:result',(_,r)=>cb(r)),
 overlayDrop:paths=>ipcRenderer.send('overlay:dropped',paths),
 overlayConvert:payload=>ipcRenderer.send('overlay:convert',payload),
 overlayClose:()=>ipcRenderer.send('overlay:close'),
 onOverlayState:cb=>ipcRenderer.on('overlay:state',(_,s)=>cb(s))
});
