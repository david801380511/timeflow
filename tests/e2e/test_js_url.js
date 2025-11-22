const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Track all JS file requests
  page.on('request', request => {
    if (request.url().includes('calendar.js')) {
      console.log('✓ Calendar JS URL:', request.url());
    }
  });

  console.log('Loading calendar page...');
  await page.goto('http://127.0.0.1:8000/calendar', { waitUntil: 'networkidle2' });

  // Also check what the HTML actually has
  const scriptSrc = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts
      .filter(s => s.src.includes('calendar'))
      .map(s => s.src);
  });
  console.log('✓ Script tags:', scriptSrc);

  await browser.close();
})();
