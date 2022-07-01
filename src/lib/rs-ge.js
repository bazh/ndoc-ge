const { dialog } = require('electron');
const puppeteer = require('puppeteer');


const URL = 'https://eservices.rs.ge/Login.aspx'

const SMALL_BUSSINESS_INCOME_TEXT = 'მცირე ბიზნესის საშემოსავლო გადასახადი';
const DECLARATIONS_MODULE_TEXT = 'დეკლარაციები';

const MONTHLY_DECLARATION_TEXT = 'ყოველთვიური';
const CREATE_NEW_DECLARATION_TEXT = 'ახალი დეკლარაცია';

const NO_DECLARATION_NEEDED_TEXT = 'მოცემულ პერიოდში თქვენ ამ დეკლარაციის შევსება არ გეკუთვნით';
const DECLARATION_IS_ALREADY_IN_PROGRESS = 'თქვენ უკვე გაქვთ გახსნილი ამ პერიოდის ფორმა';
const DECLARATION_SUBMIT_SUCCESS = 'მონაცემები წარმატებით შეინახა';
const DECLARATION_SUBMIT_SUCCESS_INFO = 'დეკლარაცია გადაიგზავნა წარმატებით';

const LOGIN_TIMEOUT = 300000;
const RENDER_TIMEOUT = 10000;

module.exports.get = get;

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function get(user, password, monthIncome, accumIncome, autoSubmit) {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage();
    await page.goto(URL, {waitUntil: 'networkidle0'});

    await login(page, user, password);
    await createDeclaration(page);

    await fillDeclaration(page, monthIncome, accumIncome);

    // Dangerous...
    if (autoSubmit) {
        await submitDeclaration(page);
    }
}


async function login(page, user, password) {
    await page.type('input#username', user);
    await page.keyboard.press('Tab');
    await page.keyboard.type(password);
    await page.keyboard.press('Enter');

    await page.waitForNavigation({waitUntil: 'networkidle0', timeout: LOGIN_TIMEOUT});
    await page.waitForSelector('div.fullName', {timeout: RENDER_TIMEOUT});
}

async function createDeclaration(page) {
    await page.click('i#ctl00_modulesI');

    const [declModule] = await page.$x(`//p[text()='${DECLARATIONS_MODULE_TEXT}']`);
    if (!declModule) {
        throw new Error(`Declarations module is not found`);
    }

    await declModule.click();
    await page.waitForNavigation({waitUntil: 'networkidle0', timeout: LOGIN_TIMEOUT});
    await page.waitForSelector('h3#hka0', {timeout: RENDER_TIMEOUT});

    const [monthly] = await page.$x(`//a[text()='${MONTHLY_DECLARATION_TEXT}']`);
    monthly.click();
    await timeout(200);

    const [div] = await page.$x(`//td[text()='${SMALL_BUSSINESS_INCOME_TEXT}']`);
    await div.click();
    await timeout(200);

    await page.waitForSelector('div#control_0_new', {timeout: RENDER_TIMEOUT});
    const [newDecl] = await page.$x(`//div[contains(text(), '${CREATE_NEW_DECLARATION_TEXT}')]`);

    let dialogMsg;
    page.once('dialog', async (dialog) => {
        dialogMsg = dialog.message();
        await dialog.dismiss();
    });

    await newDecl.click();
    await timeout(200);
    if (dialogMsg) {
        switch (dialogMsg) {
            case NO_DECLARATION_NEEDED_TEXT:
                throw new Error(`You don't need to create declaration for this month`);
            case DECLARATION_IS_ALREADY_IN_PROGRESS:
                throw new Error(`Declaration is already in progress! Remove a draft and try again`);
            default:
                throw new Error(`Create declaration error: ${dialogMsg}`);
        }
    }

    await page.waitForSelector(`input[x_name='COL_15']`, {timeout: RENDER_TIMEOUT});
}

async function fillDeclaration(page, monthIncome, accumIncome) {
    await page.type(`input[x_name='COL_15']`, '' + accumIncome);
    await page.type(`input[x_name='COL_17']`, '' + monthIncome);

    await page.click(`li.next`);
}

async function submitDeclaration(page) {
    await page.waitForSelector(`li.send`, {timeout: RENDER_TIMEOUT});

    await page.click(`li.send`);
    await timeout(500);

    await page.keyboard.press('Enter');

    let dialogMsg;
    page.once('dialog', async (dialog) => {
        dialogMsg = dialog.message();
        await dialog.dismiss();
    });

    await timeout(500);
    if (dialogMsg) {
        switch (dialogMsg) {
            case DECLARATION_SUBMIT_SUCCESS:
                break;
            default:
                throw new Error(`Submit declaration error: ${dialogMsg}`);
        }
    } else {
        throw new Error(`Declaration submit confirmation is not displayed`);
    }


    // Doing random timeouts here, because too difficult to test (once per month...)
    await page.keyboard.press('Enter');
    await timeout(500);

    await page.waitForSelector('div.window_panel.ui.draggable', {timeout: RENDER_TIMEOUT});
    await timeout(100);
    const [confirm] = await page.$x(`//b[contains(text(), '${DECLARATION_SUBMIT_SUCCESS_INFO}')]`);

    if (!confirm) {
        throw new Error('Success dialog is not displayed. Something is wrong');
    }

    await page.click(`div[title='close window'`);
    await timeout(100);
}
