const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('convee', {
  chooseFiles: () => ipcRenderer.invoke('files:choose'),
  inspect: paths => ipcRenderer.invoke('files:inspect', paths),
  formats: ext => ipcRenderer.invoke('formats:list', ext),
  convert: payload => ipcRenderer.invoke('files:convert', payload),
  reveal: p => ipcRenderer.invoke('files:reveal', p),
  open: p => ipcRenderer.invoke('files:open', p),
  onFilesChosen: callback => ipcRenderer.on('files:chosen', (_, paths) => callback(paths))
});
