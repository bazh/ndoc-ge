const puppeteer = require('puppeteer');
const moment = require('moment');
const fetch = require('node-fetch');
const util = require('util');
const xml2js = require('xml2js');


const URL = 'http://my.libertybank.ge';
const URL_ACCOUNTS='https://my.libertybank.ge/api/account/v2/current/accounts';
const URL_XML = `https://my.libertybank.ge/api/transaction/v2/statements/export/xml?AccountId=%s&StartDate=%s&EndDate=%s`
const SWIFT_IN = 'SWIFT (IN)';

const LOGIN_TIMEOUT = 300000;
const RENDER_TIMEOUT = 10000;

class Liberty {
    constructor() {}

    async init() {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null
        });


        this.__browser = browser;
        this.__page = await browser.newPage();
    }

    async authorize(user, password) {
        const page = this.__page;

        await page.goto(URL, {waitUntil: 'networkidle0'});

        await switchToEnglish(page);

        let headers;
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const h = request.headers();
            if (h.authorization) {
                headers = h;
            }
            request.continue();
        });

        await login(page, user, password);

        if (!headers) {
            throw new Error('Unable to get access token: no appropriate headers found');
        }

        this.__headers = headers;
    }

    getHeaders() {
        if (!this.__headers) {
            throw new Error(`Authorization is not completed`);
        }

        return this.__headers;
    }

    async getAccounts() {
        const req = await fetch(URL_ACCOUNTS, {
            method: 'GET',
            headers: this.getHeaders()
        });
        const data = await req.json();

        return data.map((item) => {
            const d = item.accounts[0];
            const b = item.balances[0];
            return {
                iban: item.iban,
                id: d.accountId,
                currency: d.currency,
                balance: b.availableBalance
            };
        });
    }

    async getStatement(accId, lte, gte) {
        const url = util.format(URL_XML, accId, moment(lte).utc(true).unix(), moment(gte).utc(true).unix());

        const req = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders()
        });

        const s = await req.text();
        const parsed = await xml2js.parseStringPromise(s);

        const data = parsed?.StatementInfo?.Statements[0]?.GeneralStatement;
        if (!data) {
            // No transactions found?
            return [];
        }

        return data.map((item) => {
            return {
                info: item?.AdditionalInfo[0],
                payment: parseFloat(item?.Debit[0]?.Amount[0]),
                currency: item?.Debit[0]?.Currency[0],
                sender: item?.Sender[0],
                type: item?.Type[0],
                timestamp: moment.parseZone(item?.TransactionDate[0]).utc(true).toISOString()
            }
        })
        .filter((item) => {
            return item.type === SWIFT_IN;
        });
    }

    async get(user, pass, iban, month) {
        if (!this.__browser) {
            await this.init();
        }

        await this.authorize(user, pass);

        await this.showLoading();

        const accs = await this.getAccounts();

        let accId;
        accs.forEach((item) => {
            if (item.iban == iban) {
                accId = item.id;
            }
        });
        if (!accId) {
            throw new Error(`Account ${iban} is not found`);
        }

        const gte = moment(month).startOf('month');
        const lte = moment(month).endOf('month');
        const ygte = moment(month).startOf('year');

        const res = await this.getStatement(accId, gte, lte);
        const resY = await this.getStatement(accId, ygte, lte);

        await this.close();

        return {
            month: res,
            year: resY
        };
    }

    async showLoading() {
        const page = this.__page;
        if (!page) {
            return;
        }

        return await page.evaluate(() => {
            let dom = document.querySelector('body');
            dom.innerHTML = `<div style="font-size: 50px;">Данные загружаются. Пожалуйста подождите...</div>`
        });
    }

    async close() {
            const browser = this.__browser;
            if (!browser) {
                return;
            }

            return await browser.close();
        }
    }

module.exports = Liberty;

async function switchToEnglish(page) {
    await page.waitForSelector('a#lang-eng', {timeout: RENDER_TIMEOUT});
    const geo = await page.$('a.is-hidden#lang-geo');
    if (!geo) {
        return
    }

    const sw = await page.$('a#lang-eng');
    await sw.click();
    await page.waitForNavigation({waitUntil: 'networkidle0'});
}


async function login(page, user, password) {
    await page.waitForSelector('input#username', {timeout: RENDER_TIMEOUT});
    await page.waitForSelector('input#password', {timeout: RENDER_TIMEOUT});
    await page.type('input#username', user);
    await page.keyboard.press('Tab');
    await page.keyboard.type(password);
    await page.keyboard.press('Enter');

    await page.waitForNavigation({waitUntil: 'networkidle0', timeout: LOGIN_TIMEOUT});
    // await page.waitForSelector('img#img-Header-1.lb-logo-main', {timeout: RENDER_TIMEOUT});
}
