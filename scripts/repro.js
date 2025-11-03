import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import serveHandler from 'serve-handler';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = 4173;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const server = http.createServer((request, response) => {
    return serveHandler(request, response, {
      public: DIST_DIR,
      cleanUrls: false,
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, resolve);
  });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    console.log('[page console]', msg.text());
  });

  page.on('pageerror', (err) => {
    console.error('[page error]', err.stack || err.message);
  });

  try {
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'load' });
    await delay(5000);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})();
