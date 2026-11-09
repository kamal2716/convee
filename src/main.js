const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { convertFile, getFormats } = require('./converter');

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 850, minHeight: 620,
    backgroundColor: '#080a0f', title: 'convee',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'Add files…', accelerator: 'CmdOrCtrl+O', click: () => chooseFiles() },
      { label: 'Open output folder', click: () => shell.openPath(app.getPath('downloads')) },
      { type: 'separator' }, { role: 'quit' }
    ]},
    { label: 'Edit', submenu: [{ role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] }
  ]));
}
async function chooseFiles() {
  const result = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] });
  if (!result.canceled) win.webContents.send('files:chosen', result.filePaths);
}
app.whenReady().then(() => {
  ipcMain.handle('files:choose', chooseFiles);
  ipcMain.handle('files:inspect', async (_, paths) => Promise.all(paths.map(async p => {
    const s = await fs.stat(p); return { path: p, name: path.basename(p), size: s.size, ext: path.extname(p).slice(1).toLowerCase() };
  })));
  ipcMain.handle('formats:list', (_, ext) => getFormats(ext));
  ipcMain.handle('files:convert', async (_, payload) => convertFile(payload));
  ipcMain.handle('files:reveal', (_, p) => shell.showItemInFolder(p));
  ipcMain.handle('files:open', (_, p) => shell.openPath(p));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
