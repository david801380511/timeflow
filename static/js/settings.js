// DOM Elements
const timerSettingsForm = document.getElementById('timer-settings');
const addActivityForm = document.getElementById('add-activity-form');
const activityList = document.getElementById('activity-list');

// State
let settings = null;
let breakActivities = [];

// Initialize the settings page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Settings page loaded');
    await loadSettings();
    await loadBreakActivities();
    setupEventListeners();
});

// Load user settings
async function loadSettings() {
    try {
        const response = await fetch('/api/settings/');
        settings = await response.json();
        populateSettingsForm(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        // Use default settings if API fails
        settings = {
            work_interval: 25,
            short_break: 5,
            long_break: 15,
            short_breaks_before_long: 3,
            auto_start_breaks: true,
            auto_start_pomodoros: true,
            long_break_delay: 15
        };
        populateSettingsForm(settings);
    }
}

// Populate the settings form with current values
function populateSettingsForm(settings) {
    if (!settings) return;

    // Timer settings
    if (document.getElementById('work-interval')) document.getElementById('work-interval').value = settings.work_interval || 25;
    if (document.getElementById('short-break')) document.getElementById('short-break').value = settings.short_break || 5;
    if (document.getElementById('long-break')) document.getElementById('long-break').value = settings.long_break || 15;
    if (document.getElementById('short-breaks-before-long')) document.getElementById('short-breaks-before-long').value = settings.short_breaks_before_long || 3;
    if (document.getElementById('preferred-start-hour')) document.getElementById('preferred-start-hour').value = settings.preferred_start_hour || 9;
    if (document.getElementById('preferred-end-hour')) document.getElementById('preferred-end-hour').value = settings.preferred_end_hour || 17;
}

// Load break activities
async function loadBreakActivities() {
    try {
        const response = await fetch('/api/break-activities/');
        breakActivities = await response.json();
        renderBreakActivities();
    } catch (error) {
        console.error('Error loading break activities:', error);
        breakActivities = [];
        renderBreakActivities();
    }
}

// Render break activities in the UI
function renderBreakActivities() {
    if (!activityList) return;

    if (!breakActivities || breakActivities.length === 0) {
        activityList.innerHTML = `
            <li class="text-center py-4 text-gray-500 dark:text-gray-400">
                No break activities found. Add your first activity above!
            </li>
        `;
        return;
    }
    
    activityList.innerHTML = breakActivities.map(activity => `
        <li class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div class="flex items-center gap-3">
                <div class="p-2 rounded-full ${activity.activity_type === 'short' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}">
                    <i class="fas ${activity.activity_type === 'short' ? 'fa-coffee' : 'fa-gamepad'}"></i>
                </div>
                <div>
                    <p class="font-medium text-gray-900 dark:text-white">${activity.name}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">${activity.activity_type} Break</p>
                </div>
            </div>
            <button class="delete-activity text-gray-400 hover:text-red-500 transition-colors" data-id="${activity.id}">
                <i class="fas fa-trash"></i>
            </button>
        </li>
    `).join('');
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-activity').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const activityId = parseInt(btn.dataset.id);
            deleteActivity(activityId);
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    // Timer settings form
    if (timerSettingsForm) {
        timerSettingsForm.addEventListener('submit', handleTimerSettingsSubmit);
    }
    
    // Add activity form
    if (addActivityForm) {
        console.log('Add activity form found, attaching listener');
        addActivityForm.addEventListener('submit', handleAddActivitySubmit);
    } else {
        console.error('Add activity form NOT found');
    }
}

// Handle timer settings form submission
async function handleTimerSettingsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(timerSettingsForm);
    const settings = {
        work_interval: parseInt(formData.get('work_interval')),
        short_break: parseInt(formData.get('short_break')),
        long_break: parseInt(formData.get('long_break')),
        short_breaks_before_long: parseInt(formData.get('short_breaks_before_long')),
        preferred_start_hour: parseInt(formData.get('preferred_start_hour')),
        preferred_end_hour: parseInt(formData.get('preferred_end_hour')),
        long_break_delay: 15
    };
    
    try {
        const response = await fetch('/api/settings/', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update settings');
        }
        
        alert('Timer settings saved successfully!');
    } catch (error) {
        console.error('Error updating settings:', error);
        alert('Failed to save settings. Please try again.');
    }
}

// Handle add activity form submission
async function handleAddActivitySubmit(e) {
    e.preventDefault();
    console.log('Adding activity...');
    
    const nameInput = document.getElementById('new-activity');
    const name = nameInput.value.trim();
    
    if (!name) {
        console.log('No name provided');
        return;
    }
    
    const activity = {
        name: name,
        activity_type: 'short', // Default to short break
        duration: 5 // Default duration
    };
    
    try {
        const response = await fetch('/api/break-activities/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(activity)
        });
        
        if (!response.ok) {
            throw new Error('Failed to add activity');
        }
        
        nameInput.value = '';
        await loadBreakActivities();
    } catch (error) {
        console.error('Error adding activity:', error);
        alert('Failed to add activity. Please try again.');
    }
}

// Delete an activity
async function deleteActivity(activityId) {
    if (!confirm('Are you sure you want to delete this activity?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/break-activities/${activityId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete activity');
        }
        
        await loadBreakActivities();
    } catch (error) {
        console.error('Error deleting activity:', error);
        alert('Failed to delete activity. Please try again.');
    }
}
