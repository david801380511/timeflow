const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('Checking homepage...');
  await page.goto('http://127.0.0.1:8001/', { waitUntil: 'networkidle2' });
  
  if (page.url().includes('/login')) {
      console.log('Redirected to login. Logging in...');
      // Assuming testuser exists from previous tests or we need to signup?
      // Let's try to login with testuser/password123
      await page.type('input[name="username"]', 'testuser');
      await page.type('input[name="password"]', 'password123');
      await Promise.all([
          page.waitForNavigation(),
          page.click('button[type="submit"]')
      ]);
  }

  await page.screenshot({ path: 'homepage.png', fullPage: true });

  // Get assignment time display
  const timeDisplays = await page.evaluate(() => {
    const paragraphs = Array.from(document.querySelectorAll('p'));
    return paragraphs
      .filter(p => p.textContent.includes('Estimated Time:'))
      .map(p => p.textContent.trim());
  });
  console.log('Homepage time displays:', timeDisplays);

  console.log('\nChecking timer page...');
  await page.goto('http://127.0.0.1:8001/timer', { waitUntil: 'networkidle2' });
  // Wait a bit for JS to load assignments
  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: 'timer-page.png', fullPage: true });

  // Get dropdown options
  const dropdownOptions = await page.evaluate(() => {
    const select = document.querySelector('#assignment-select');
    if (!select) return 'No select found';
    return Array.from(select.options).map(opt => opt.textContent.trim());
  });
  console.log('Timer dropdown options:', dropdownOptions);

  console.log('\nChecking calendar page...');
  await page.goto('http://127.0.0.1:8001/calendar', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'calendar-page.png', fullPage: true });

  // Check for break blocks
  const breakBlocks = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('.block-pill'));
    return blocks.filter(b => b.classList.contains('break')).map(b => b.textContent.trim());
  });
  console.log('Break blocks found:', breakBlocks.length > 0 ? breakBlocks : 'None');

  await browser.close();
  console.log('\nScreenshots saved: homepage.png, timer-page.png, calendar-page.png');
})();
