const puppeteer = require('puppeteer');

(async () => {
  const url = 'http://localhost:5173/entrenamiento-rapido/1';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const consoleMessages = [];
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log('[page console]', text);
  });

  page.on('pageerror', (err) => {
    errors.push(err.toString());
    console.error('[page error]', err.toString());
  });

  // Intercept network failures
  page.on('requestfailed', (req) => {
    console.warn('[request failed]', req.url(), req.failure()?.errorText);
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Wait a bit for client-side rendering
    await page.waitForTimeout(1000);

    const title = await page.$eval('h1', (el) => el.innerText).catch(() => null);
    console.log('Detected H1:', title);

    const content = await page.content();
    if (content) console.log('Page length:', content.length);

    // Take a quick screenshot for inspection
    await page.screenshot({ path: 'temp-microcase-screenshot.png', fullPage: false });

    console.log('Console messages count:', consoleMessages.length);
    console.log('Page errors count:', errors.length);
  } catch (err) {
    console.error('Error loading page', err);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();
