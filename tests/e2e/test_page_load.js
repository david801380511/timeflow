const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Listen for errors
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Loading calendar page...');
  try {
    await page.goto('http://127.0.0.1:8000/calendar', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✓ Page loaded successfully');
    await page.screenshot({ path: 'test-page-load.png', fullPage: true });
    console.log('✓ Screenshot saved');
  } catch (e) {
    console.log('✗ Failed to load page:', e.message);
  }

  await browser.close();
})();
