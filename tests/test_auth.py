"""
Test authentication and basic navigation
"""
import os
import pytest
from playwright.sync_api import Page, expect

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = os.getenv('TEST_EMAIL', 'test@example.com')
TEST_PASSWORD = os.getenv('TEST_PASSWORD', 'testpassword')

def test_login(page: Page):
    """Test login functionality"""
    # Navigate to login page
    page.goto(f"{BASE_URL}/login")
    
    # Fill in login form
    page.fill('input[name="email"]', TEST_EMAIL)
    page.fill('input[name="password"]', TEST_PASSWORD)
    
    # Click login button
    with page.expect_navigation():
        page.click('button[type="submit"]')
    
    # Verify we're on the timer page after login
    expect(page).to_have_url(f"{BASE_URL}/timer")
    
    # Verify user is logged in
    expect(page.locator('button:has-text("Logout")')).to_be_visible()

def test_navigation_to_timer(page: Page):
    """Test navigation to timer page"""
    # Navigate directly to timer page
    page.goto(f"{BASE_URL}/timer")
    
    # Should be redirected to login if not authenticated
    if "/login" in page.url:
        # Log in if not already
        page.fill('input[name="email"]', TEST_EMAIL)
        page.fill('input[name="password"]', TEST_PASSWORD)
        with page.expect_navigation():
            page.click('button[type="submit"]')
    
    # Verify we're on the timer page
    expect(page).to_have_url(f"{BASE_URL}/timer")
    expect(page.locator('#time-method-select')).to_be_visible()
