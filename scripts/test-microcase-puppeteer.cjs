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

  page.on('requestfailed', (req) => {
    const info = req.failure ? (req.failure().errorText) : 'unknown';
    console.warn('[request failed]', req.url(), info);
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const title = await page.$eval('h1', (el) => el.innerText).catch(() => null);
    console.log('Detected H1:', title);

    const content = await page.content();
    if (content) console.log('Page length:', content.length);

    // If there are option buttons, click the first one to exercise navigation and feedback
    const firstOptionButton = await page.$('div.grid button');
    if (firstOptionButton) {
      console.log('Clicking first option button');
      await firstOptionButton.click();
      // wait briefly for navigation/feedback to occur
      await new Promise((resolve) => setTimeout(resolve, 900));
      await page.screenshot({ path: 'temp-microcase-screenshot.png', fullPage: false });
    } else {
      console.log('No option buttons found to click');
    }

    console.log('Console messages count:', consoleMessages.length);
    console.log('Page errors count:', errors.length);
  } catch (err) {
    console.error('Error loading page', err);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();
