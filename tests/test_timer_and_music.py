"""
Tests for Time Management Methods and Music Player functionality
"""
import os
import sys
import time
from pathlib import Path
import pytest
from playwright.sync_api import Page, expect, sync_playwright

# Add the project root to the Python path
project_root = str(Path(__file__).parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import the create_test_user function
from scripts.create_test_user import create_test_user

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = os.getenv('TEST_EMAIL', 'test@example.com')
TEST_PASSWORD = os.getenv('TEST_PASSWORD', 'testpassword')

# Ensure test user exists before running tests
create_test_user(TEST_EMAIL, TEST_PASSWORD)

# Playwright fixtures
@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    return {
        **browser_type_launch_args,
        "headless": False,  # Set to True for CI/CD
        "slow_mo": 100,     # Slow down execution for visual feedback
    }

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "viewport": {
            "width": 1280,
            "height": 1024,
        },
        "storage_state": None,  # We'll handle auth in setup_teardown
    }

class TestTimeManagementMethods:
    """Test time management methods functionality"""

    def test_time_method_selection(self, page: Page):
        """Test selecting different time management methods"""
        # Test Pomodoro method
        page.select_option('select#time-method-select', 'pomodoro')
        expect(page.locator('#method-description'))\
            .to_contain_text('0.42 hours')
        
        # Test 52-17 method
        page.select_option('select#time-method-select', '52-17')
        expect(page.locator('#method-description'))\
            .to_contain_text('0.87 hours')
        
        # Verify method parameters update
        work_duration = page.locator('input[onchange*="workDuration"]')
        short_break = page.locator('input[onchange*="shortBreak"]')
        
        # Check Pomodoro values (25/5)
        page.select_option('select#time-method-select', 'pomodoro')
        expect(work_duration).to_have_value('0.42')  # 25 minutes
        expect(short_break).to_have_value('0.08')    # 5 minutes
        
        # Check 52-17 values
        page.select_option('select#time-method-select', '52-17')
        expect(work_duration).to_have_value('0.87')  # 52 minutes
        expect(short_break).to_have_value('0.28')    # 17 minutes

    def test_custom_time_method(self, page: Page):
        """Test creating and using a custom time method"""
        page.goto(f"{BASE_URL}/timer")
        
        # Select custom method
        page.select_option('select#time-method-select', 'custom')
        
        # Update custom values
        work_input = page.locator('input[onchange*="workDuration"]')
        work_input.fill('1.5')
        
        short_break_input = page.locator('input[onchange*="shortBreak"]')
        short_break_input.fill('0.25')
        
        long_break_input = page.locator('input[onchange*="longBreak"]')
        long_break_input.fill('0.5')
        
        # Verify the values were updated
        expect(work_input).to_have_value('1.5')
        expect(short_break_input).to_have_value('0.25')
        expect(long_break_input).to_have_value('0.5')

    def test_timer_functionality(self, page: Page):
        """Test starting and pausing the timer"""
        # Get timer display element
        timer_display = page.locator('#timer-display')
        initial_time = timer_display.text_content()
        
        # Start the timer
        start_button = page.locator('button:has-text("Start")')
        start_button.click()
        
        # Verify timer is running
        expect(page.locator('button:has-text("Pause")')).to_be_visible()
        
        # Wait a moment to ensure timer is counting down
        time.sleep(2)
        
        # Verify time has changed
        current_time = timer_display.text_content()
        assert current_time != initial_time, "Timer display should update when running"
        
        # Pause the timer
        page.click('button:has-text("Pause")')
        expect(page.locator('button:has-text("Resume")')).to_be_visible()
        
        # Verify timer is paused
        paused_time = timer_display.text_content()
        time.sleep(1)
        assert timer_display.text_content() == paused_time, \
            "Timer should not change when paused"


class TestMusicPlayer:
    """Test music player functionality"""

    def test_play_pause_functionality(self, page: Page):
        """Test play/pause functionality"""
        # Get the play/pause button
        play_button = page.locator('button#play-pause')
        
        # Initial state should be play
        expect(play_button.locator('i.fa-play')).to_be_visible()
        
        # Click to play
        play_button.click()
        
        # Should now show pause icon
        expect(play_button.locator('i.fa-pause')).to_be_visible()
        
        # Click to pause
        play_button.click()
        
        # Should show play icon again
        expect(play_button.locator('i.fa-play')).to_be_visible()

    def test_station_selection(self, page: Page):
        """Test selecting different radio stations"""
        # Get the first station button
        station_buttons = page.locator('.station-button')
        first_station = station_buttons.first
        first_station_name = first_station.text_content().strip()
        
        # Select the first station
        first_station.click()
        
        # Verify now playing shows the selected station
        now_playing = page.locator('#now-playing')
        expect(now_playing).to_contain_text(first_station_name)
        
        # If there's a second station, test switching
        if station_buttons.count() > 1:
            second_station = station_buttons.nth(1)
            second_station_name = second_station.text_content().strip()
            second_station.click()
            
            # Verify now playing updated
            expect(now_playing).to_contain_text(second_station_name)
            expect(now_playing).not_to_contain_text(first_station_name)


class TestTimeDisplay:
    """Test time display formatting"""
    
    def test_time_formatting(self, page: Page):
        """Test that time is displayed in the correct format"""
        # Test display for less than an hour (should show MM:SS)
        page.evaluate('''() => {
            if (window.updateTimerDisplay) {
                window.updateTimerDisplay(179); // 2:59
            }
        }''')
        
        # Only run assertions if the function exists
        if page.evaluate('!!window.updateTimerDisplay'):
            time_display = page.locator('#time-display')
            expect(time_display).to_have_text('02:59', timeout=1000)
            
            # Test display for more than an hour (should show HH:MM:SS)
            page.evaluate('window.updateTimerDisplay(3661)')  # 1:01:01
            expect(time_display).to_have_text('01:01:01', timeout=1000)


# Fixtures
@pytest.fixture(scope="function", autouse=True)
def setup_teardown(page: Page):
    """Setup and teardown for each test"""
    try:
        # Navigate to login page
        page.goto(f"{BASE_URL}/login")
        
        # Check if already logged in
        if page.locator('button:has-text("Logout")').count() == 0:
            # Wait for login form to be visible
            page.wait_for_selector('input[name="email"]', state='visible')
            
            # Fill login form
            page.fill('input[name="email"]', TEST_EMAIL)
            page.fill('input[name="password"]', TEST_PASSWORD)
            
            # Click login button and wait for navigation
            with page.expect_navigation():
                page.click('button[type="submit"]')
        
        # Ensure we're on the timer page
        page.goto(f"{BASE_URL}/timer")
        page.wait_for_selector('#time-method-select', state='visible', timeout=10000)
        
        yield
        
    except Exception as e:
        # Take screenshot on failure
        page.screenshot(path="test_failure.png")
        raise e


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--headed"])
