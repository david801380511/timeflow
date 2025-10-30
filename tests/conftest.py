"""
Pytest configuration and fixtures for Playwright tests
"""
import pytest


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Configure browser context arguments"""
    return {
        **browser_context_args,
        "viewport": {"width": 1280, "height": 720},
    }
