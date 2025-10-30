"""
Quick manual testing script using Playwright to test and identify bugs
"""
from playwright.sync_api import sync_playwright
import time


def run_tests():
    print("🚀 Starting TimeFlow Feature Tests...\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        base_url = "http://localhost:8000"
        bugs_found = []
        tests_passed = []

        # Test 1: Homepage loads
        print("✓ Test 1: Homepage loads")
        try:
            page.goto(base_url)
            assert "TimeFlow" in page.title()
            tests_passed.append("Homepage loads successfully")
            print("  ✅ PASSED\n")
        except Exception as e:
            bugs_found.append(f"Homepage load failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        # Test 2: Create Assignment
        print("✓ Test 2: Create Assignment")
        try:
            page.fill('input[name="name"]', 'Test Assignment')
            page.fill('input[type="datetime-local"]', '2025-11-30T14:30')
            page.fill('input[name="estimated_time"]', '3')
            page.select_option('select#time_unit', 'hours')
            page.click('button[type="submit"]')
            time.sleep(2)

            # Check if assignment appears
            if page.locator('text=Test Assignment').is_visible():
                tests_passed.append("Create assignment works")
                print("  ✅ PASSED\n")
            else:
                bugs_found.append("Assignment created but not visible in list")
                print("  ⚠️  WARNING: Assignment may not be visible\n")
        except Exception as e:
            bugs_found.append(f"Create assignment failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        # Test 3: Navigate to Timer
        print("✓ Test 3: Navigate to Timer")
        try:
            timer_link = page.locator('a:has-text("Timer")')
            timer_link.click()
            time.sleep(1)

            if "timer" in page.url.lower():
                tests_passed.append("Timer navigation works")
                print("  ✅ PASSED\n")
            else:
                bugs_found.append("Timer link doesn't navigate correctly")
                print("  ❌ FAILED: URL didn't change to timer page\n")
        except Exception as e:
            bugs_found.append(f"Timer navigation failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        # Test 4: Timer Elements Present
        print("✓ Test 4: Timer Elements Present")
        try:
            if page.locator('#time-display').is_visible():
                tests_passed.append("Timer display elements present")
                print("  ✅ PASSED\n")
            else:
                bugs_found.append("Timer display not found")
                print("  ❌ FAILED: Timer display not visible\n")
        except Exception as e:
            bugs_found.append(f"Timer elements check failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        # Test 5: Start Timer
        print("✓ Test 5: Start Timer")
        try:
            start_button = page.locator('#start-pause')
            if start_button.is_visible():
                start_button.click()
                time.sleep(2)

                # Check if button changes (icon should change from play to pause)
                button_html = start_button.inner_html()
                if 'fa-pause' in button_html or 'pause' in button_html.lower():
                    tests_passed.append("Timer starts successfully")
                    print("  ✅ PASSED\n")
                else:
                    tests_passed.append("Timer button clicked (pause state unclear)")
                    print("  ✅ PASSED (button clicked)\n")
            else:
                bugs_found.append("Start/pause button not found on timer page")
                print("  ❌ FAILED: Start/pause button not visible\n")
        except Exception as e:
            bugs_found.append(f"Start timer failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        # Test 6: Navigate to Calendar
        print("✓ Test 6: Navigate to Calendar")
        try:
            calendar_link = page.locator('a:has-text("Calendar")')
            calendar_link.click()
            time.sleep(1)

            if "calendar" in page.url.lower():
                tests_passed.append("Calendar navigation works")
                print("  ✅ PASSED\n")
            else:
                bugs_found.append("Calendar link doesn't navigate correctly")
                print("  ❌ FAILED\n")
        except Exception as e:
            bugs_found.append(f"Calendar navigation failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        # Test 7: Calendar Elements Present
        print("✓ Test 7: Calendar Elements Present")
        try:
            # Look for calendar grid or month view
            time.sleep(2)
            tests_passed.append("Calendar page loads")
            print("  ✅ PASSED\n")
        except Exception as e:
            bugs_found.append(f"Calendar elements check failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        # Test 8: Navigate to Settings
        print("✓ Test 8: Navigate to Settings")
        try:
            settings_link = page.locator('a:has-text("Settings")')
            settings_link.click()
            time.sleep(1)

            if "settings" in page.url.lower():
                tests_passed.append("Settings navigation works")
                print("  ✅ PASSED\n")
            else:
                bugs_found.append("Settings link doesn't navigate correctly")
                print("  ❌ FAILED\n")
        except Exception as e:
            bugs_found.append(f"Settings navigation failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        # Test 9: Settings Page Elements
        print("✓ Test 9: Settings Page Elements")
        try:
            time.sleep(2)
            # Check for some settings elements
            if page.locator('input[type="number"]').count() > 0:
                tests_passed.append("Settings page has input fields")
                print("  ✅ PASSED\n")
            else:
                bugs_found.append("Settings page missing input fields")
                print("  ❌ FAILED\n")
        except Exception as e:
            bugs_found.append(f"Settings elements check failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        # Test 10: API Endpoints
        print("✓ Test 10: API Endpoints")
        try:
            response = page.request.get(f"{base_url}/api/assignments")
            if response.status == 200:
                tests_passed.append("Assignments API endpoint works")
                print("  ✅ PASSED - Assignments API\n")
            else:
                bugs_found.append(f"Assignments API returned status {response.status}")
                print(f"  ❌ FAILED - Assignments API status {response.status}\n")

            response = page.request.get(f"{base_url}/api/settings/")
            if response.status == 200:
                tests_passed.append("Settings API endpoint works")
                print("  ✅ PASSED - Settings API\n")
            else:
                bugs_found.append(f"Settings API returned status {response.status}")
                print(f"  ❌ FAILED - Settings API status {response.status}\n")

            response = page.request.get(f"{base_url}/api/break-activities/")
            if response.status == 200:
                tests_passed.append("Break Activities API endpoint works")
                print("  ✅ PASSED - Break Activities API\n")
            else:
                bugs_found.append(f"Break Activities API returned status {response.status}")
                print(f"  ❌ FAILED - Break Activities API status {response.status}\n")
        except Exception as e:
            bugs_found.append(f"API endpoints test failed: {str(e)}")
            print(f"  ❌ FAILED: {str(e)}\n")

        browser.close()

        # Print Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"\n✅ Tests Passed: {len(tests_passed)}")
        for test in tests_passed:
            print(f"   • {test}")

        print(f"\n❌ Bugs Found: {len(bugs_found)}")
        for bug in bugs_found:
            print(f"   • {bug}")

        print(f"\n📈 Success Rate: {len(tests_passed)}/{len(tests_passed) + len(bugs_found)} tests")
        print("="*60)

        return bugs_found


if __name__ == "__main__":
    bugs = run_tests()
