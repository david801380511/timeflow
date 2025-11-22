const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('Navigating to calendar...');
  await page.goto('http://127.0.0.1:8000/calendar', { waitUntil: 'networkidle2' });

  // First clear the calendar
  console.log('\nClicking Clear Calendar button...');
  await page.click('#clearCalendarBtn');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Then auto-schedule
  console.log('Clicking Auto-Schedule button...');
  await page.click('#autoScheduleBtn');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for scheduling to complete

  // Check for error alerts
  const alertText = await page.evaluate(() => {
    return window.lastAlert || 'No alerts';
  });
  console.log('Alerts:', alertText);

  // Take screenshot of month view
  await page.screenshot({ path: 'calendar-after-schedule.png', fullPage: true });

  // Click on a day with events (e.g., day 21)
  console.log('\nClicking on a day to view details...');
  const dayCell = await page.$('[data-date*="2025-11-21"]');
  if (dayCell) {
    await dayCell.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for break blocks in day view
    const breakBlocks = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('.block-pill.break'));
      return pills.map(p => ({
        text: p.textContent.trim(),
        classes: p.className
      }));
    });

    console.log('Break blocks found in day view:', breakBlocks.length > 0 ? breakBlocks : 'None');

    // Take screenshot of day view
    await page.screenshot({ path: 'calendar-day-view.png', fullPage: true });
  } else {
    console.log('Could not find day cell to click');
  }

  await browser.close();
  console.log('\nScreenshots saved: calendar-after-schedule.png, calendar-day-view.png');
})();
