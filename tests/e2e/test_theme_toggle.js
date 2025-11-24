const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: false, // Run in headed mode so the user can see it
        slowMo: 100,     // Slow down operations by 100ms
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
    });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.setViewport({ width: 1280, height: 800 });

    try {
        console.log('Navigating to homepage...');
        await page.goto('http://localhost:8001', { waitUntil: 'networkidle0' });

        // Check if we are redirected to login
        if (page.url().includes('/login')) {
            console.log('Redirected to login page. Creating a new account...');
            
            // Go to signup
            await page.goto('http://localhost:8001/signup', { waitUntil: 'networkidle0' });
            
            const uniqueId = Date.now();
            const username = `testuser_${uniqueId}`;
            const email = `test_${uniqueId}@example.com`;
            const password = 'TestPassword123!';

            console.log(`Signing up with ${username}...`);

            await page.type('input[name="username"]', username);
            await page.type('input[name="email"]', email);
            await page.type('input[name="password"]', password);
            
            // Submit form
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click('button[type="submit"]')
            ]);
            
            console.log('Signup successful, redirected to:', page.url());

            // If redirected to login, we need to login
            if (page.url().includes('/login')) {
                console.log('Redirected to login. Logging in...');
                await page.type('input[name="username"]', username);
                await page.type('input[name="password"]', password);
                
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle0' }),
                    page.click('button[type="submit"]')
                ]);
                console.log('Login successful, redirected to:', page.url());
            }
        }

        // Now we should be on the dashboard
        console.log('Checking initial theme state...');
        const initialIsDark = await page.evaluate(() => {
            return document.documentElement.classList.contains('dark');
        });
        console.log(`Initial dark mode: ${initialIsDark}`);

        // Find the theme toggle button (desktop version)
        console.log('Looking for theme toggle button...');
        
        // Wait for nav to be present
        await page.waitForSelector('nav', { timeout: 5000 });

        const btnExists = await page.evaluate(() => {
            const nav = document.querySelector('nav');
            if (!nav) return false;
            
            const buttons = Array.from(nav.querySelectorAll('button'));
            // Find button with sun/moon icon
            // The icon might be inside the button or the button might contain it
            const themeBtn = buttons.find(b => b.querySelector('.fa-sun') || b.querySelector('.fa-moon'));
            
            if (themeBtn) {
                themeBtn.click();
                return true;
            }
            return false;
        });

        if (!btnExists) {
            throw new Error('Theme toggle button not found in nav');
        }
        console.log('Clicked theme toggle...');

        // Wait a bit for transition
        await new Promise(r => setTimeout(r, 1000));

        // Check new state
        const newIsDark = await page.evaluate(() => {
            return document.documentElement.classList.contains('dark');
        });
        console.log(`New dark mode: ${newIsDark}`);

        if (initialIsDark === newIsDark) {
            throw new Error('Theme did not toggle!');
        }

        console.log('Theme toggle test passed!');
        
        // Keep the browser open for a few seconds so the user can see the result
        await new Promise(r => setTimeout(r, 3000));

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
