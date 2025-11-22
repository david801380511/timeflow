const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('Taking final screenshots of the app...');

  // Homepage
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'final-homepage.png', fullPage: true });
  console.log('✓ Homepage screenshot saved');

  // Timer
  await page.goto('http://127.0.0.1:8000/timer', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: 'final-timer.png', fullPage: true });
  console.log('✓ Timer screenshot saved');

  // Calendar
  await page.goto('http://127.0.0.1:8000/calendar', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: 'final-calendar-month.png', fullPage: true });
  console.log('✓ Calendar month view screenshot saved');

  // Click on first day with events (November 21)
  try {
    const days = await page.$$('.month-day');
    let clicked = false;
    for (const day of days) {
      const dots = await day.$$('.event-dot');
      if (dots.length > 0) {
        await day.click();
        clicked = true;
        break;
      }
    }

    if (clicked) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: 'final-calendar-day.png', fullPage: true });
      console.log('✓ Calendar day view screenshot saved');

      // Check for break blocks
      const breakInfo = await page.evaluate(() => {
        const breakBlocks = Array.from(document.querySelectorAll('.block-pill.break'));
        const studyBlocks = Array.from(document.querySelectorAll('.block-pill.study'));
        const busyBlocks = Array.from(document.querySelectorAll('.block-pill.busy'));

        return {
          breakCount: breakBlocks.length,
          studyCount: studyBlocks.length,
          busyCount: busyBlocks.length,
          breakTitles: breakBlocks.map(b => b.textContent.trim()).slice(0, 3)
        };
      });

      console.log('\n📊 Block Statistics:');
      console.log(`   Break blocks: ${breakInfo.breakCount}`);
      console.log(`   Study blocks: ${breakInfo.studyCount}`);
      console.log(`   Busy blocks: ${breakInfo.busyCount}`);
      if (breakInfo.breakCount > 0) {
        console.log(`   Sample break titles: ${breakInfo.breakTitles.join(', ')}`);
      }
    }
  } catch (e) {
    console.log('Could not click day:', e.message);
  }

  await browser.close();
  console.log('\n✅ All screenshots saved successfully');
})();
