const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('Navigating to calendar...');
  await page.goto('http://127.0.0.1:8000/calendar', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('Clearing calendar...');
  try {
    await page.click('#clearCalendarBtn');
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (e) {
    console.log('Clear button click failed:', e.message);
  }

  console.log('Running auto-schedule...');
  try {
    await page.click('#autoScheduleBtn');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for scheduling
  } catch (e) {
    console.log('Auto-schedule button click failed:', e.message);
  }

  await page.screenshot({ path: 'after-schedule-month.png', fullPage: true });
  console.log('✓ Month view screenshot saved');

  // Click on first day with events
  console.log('Looking for day with events...');
  const days = await page.$$('.month-day');
  let clicked = false;
  for (const day of days) {
    const dots = await day.$$('.event-dot');
    if (dots.length > 0) {
      await day.click();
      clicked = true;
      console.log('Clicked on day with events');
      break;
    }
  }

  if (clicked) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await page.screenshot({ path: 'after-schedule-day.png', fullPage: true });
    console.log('✓ Day view screenshot saved');

    // Check for break blocks
    const blockInfo = await page.evaluate(() => {
      const breakBlocks = Array.from(document.querySelectorAll('.block-pill.break'));
      const studyBlocks = Array.from(document.querySelectorAll('.block-pill.study'));

      return {
        breakCount: breakBlocks.length,
        studyCount: studyBlocks.length,
        breakTitles: breakBlocks.map(b => b.textContent.trim()).slice(0, 5),
        studyTitles: studyBlocks.map(b => b.textContent.trim()).slice(0, 5)
      };
    });

    console.log('\n📊 Block Statistics:');
    console.log(`   Break blocks: ${blockInfo.breakCount}`);
    console.log(`   Study blocks: ${blockInfo.studyCount}`);

    if (blockInfo.breakCount > 0) {
      console.log('\n✅ Break blocks found! Sample titles:');
      blockInfo.breakTitles.forEach(t => console.log(`   - ${t}`));
    } else {
      console.log('\n❌ No break blocks found');
      console.log('Study blocks:');
      blockInfo.studyTitles.forEach(t => console.log(`   - ${t}`));
    }
  }

  await browser.close();
})();
