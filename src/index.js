const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { electron } = require('process');
const events = require('./events');

const store = require('./lib/store');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

const createWindow = () => {
    const wnd = new BrowserWindow({
        width: 1250,
        height: 768,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: false,
            devTools: true
        }
    });
    // wnd.webContents.openDevTools();

    events.windowChanged(wnd);
    wnd.loadFile(path.join(__dirname, 'app/index.html'));
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
