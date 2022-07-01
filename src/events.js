const {ipcMain, dialog} = require('electron');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const moment = require('moment');

const generator = require('./lib/invoice-generator');
const NBG = require('./lib/nbg');

const nbg = new NBG();

const Liberty = require('./lib/liberty-bank');
const rsge = require('./lib/rs-ge');

let WND;
module.exports.windowChanged = function(w) {
    WND = w;
}

module.exports.sendToUi = function(name, ...args) {
    WND.webContents.send(name, ...args);
}

ipcMain.handle('ndoc.GetSignatureFiles', async (ev, encoding) => {
    return dialog.showOpenDialog({
        title: 'Выберите картинки с подписями',
        properties: ['openFile', 'multiSelections'],
        filters: [{
            name: 'Изображения',
            extensions: ['jpg', 'png', 'gif', 'tiff']
        }]
    })
    .then((res) => {
        if (res.canceled) {
            return [];
        }

        encoding = encoding || 'base64';
        return res.filePaths.map((file) => {
            return {
                file,
                encoding: encoding,
                mime: mime.lookup(path.extname(file)),
                data: fs.readFileSync(file, encoding)
            };
        });
    });
});

ipcMain.handle('ndoc.SaveInvoice', async (ev, path) => {
    return dialog.showSaveDialog({
        title: 'Сохранить инвойс и табель',
        defaultPath: path
    });
});

ipcMain.handle('ndoc.GenerateInvoice', async (ev, cfg) => {
    return await generator(cfg);
});

ipcMain.handle('ndoc.GetCurrencyRates', async (ev, date) => {
    return await nbg.getRates(date);
});

ipcMain.handle('ndoc.LoadTransactions', async (ev, bankId, account, login, password, date) => {
    switch (bankId) {
        case 'liberty':
            const liberty = new Liberty();
            return await liberty.get(login, password, account, new Date(date));
    }

    throw new Error(`Unknown bankId ${bankId}`);
});

ipcMain.handle('ndoc.CreateDeclaration', async (ev, login, password, monthIncome, accumIncome) => {
    return await rsge.get(login, password, monthIncome, accumIncome);
});
