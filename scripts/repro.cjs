const http = require('http');
const path = require('path');
const serveHandler = require('serve-handler');
const puppeteer = require('puppeteer');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = 4173;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    console.log('[page console]', msg.text());
  });

  page.on('pageerror', (err) => {
    console.error('[page error]', err.stack || err.message);
  });

  try {
    await page.goto('https://www.simuped.com', { waitUntil: 'load' });
    await delay(5000);
  } finally {
    await browser.close();
  }
})();
