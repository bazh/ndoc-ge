const _ = require('lodash');
const async = require('async');
const fs = require('fs');
const path = require('path');
const pug = require('pug');
const archiver = require('archiver');
const {BrowserWindow} = require('electron');
const util = require('util');

const store = require('./store');

function getRandomSignature() {
    const list = store.get('signatures');
    const id = _.random(0, list.length - 1);

    return list[id];
}

function generator(cfg, done) {
    const converterJobs = [
        function(next) {
            htmlToPdf(readTemplate('templates/invoice.pug', cfg), {
                filename: 'invoice.pdf',
                landscape: false
            }, next);
        },
        function(next) {
            htmlToPdf(readTemplate('templates/timesheet.pug', cfg), {
                filename: 'timesheet.pdf',
                landscape: true
            }, next);
        }
    ];

    async.parallel(converterJobs, (err, res) => {
        if (err) {
            return done(err);
        }

        const out = fs.createWriteStream(cfg.filename);
        const archive = archiver('zip');

        archive.on('error', done);
        archive.on('finish', done);

        archive.pipe(out);

        res.forEach((item) => {
            archive.append(item.data, {name: item.filename});
        });

        archive.finalize();
    });
}

function readTemplate(name, cfg) {
    const data = fs.readFileSync(path.resolve(__dirname, name), 'utf8');
    const res = pug.compile(data)({
        invoice: cfg.invoice,
        signature: getRandomSignature(),
        _
    });

    return res;
}

function htmlToPdf(src, cfg, done) {
    const encoded = Buffer.from(src).toString('base64');

    const win = new BrowserWindow({show: false});
    win.loadURL('data:text/html;base64,' + encoded);

    win.webContents.on('did-finish-load', () => {
        win.webContents.printToPDF({
            pageSize: cfg.pageSize || 'A4',
            landscape: cfg.landscape || false,
            marginsType: 0,
            printBackground: true,
            printSelectionOnly: false
        }).then((res) => {
            return done(null, {
                filename: cfg.filename,
                data: res
            });
        }).catch((err) => {
            returndone(err)
        });
    });
}

module.exports = util.promisify(generator);
