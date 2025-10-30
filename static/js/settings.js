// DOM Elements
const timerSettingsForm = document.getElementById('timer-settings');
const notificationSettingsForm = document.getElementById('notification-settings');
const addActivityBtn = document.getElementById('add-activity-btn');
const activitiesContainer = document.getElementById('activities-container');
const activityModal = document.getElementById('activity-modal');
const activityForm = document.getElementById('activity-form');
const modalTitle = document.getElementById('modal-title');
const cancelActivityBtn = document.getElementById('cancel-activity');

// State
let settings = null;
let breakActivities = [];
let isEditing = false;
let currentActivityId = null;

// Initialize the settings page
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadBreakActivities();
    setupEventListeners();
    renderBreakActivities();
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
    document.getElementById('work-interval').value = settings.work_interval || 25;
    document.getElementById('short-break').value = settings.short_break || 5;
    document.getElementById('long-break').value = settings.long_break || 15;
    document.getElementById('short-breaks-before-long').value = settings.short_breaks_before_long || 3;
    document.getElementById('preferred-start-hour').value = settings.preferred_start_hour || 9;
    document.getElementById('preferred-end-hour').value = settings.preferred_end_hour || 17;
    document.getElementById('auto-start-breaks').checked = settings.auto_start_breaks !== false; // Default to true
    document.getElementById('auto-start-pomodoros').checked = settings.auto_start_pomodoros !== false; // Default to true

    // Notification settings (these would be loaded from user preferences)
    document.getElementById('enable-notifications').checked = true;
    document.getElementById('enable-sound').checked = true;
}

// Load break activities
async function loadBreakActivities() {
    try {
        const response = await fetch('/api/break-activities/');
        breakActivities = await response.json();
        renderBreakActivities();
    } catch (error) {
        console.error('Error loading break activities:', error);
        // Use default activities if API fails
        breakActivities = [
            { id: 1, name: 'Stretch', activity_type: 'short', duration: 5 },
            { id: 2, name: 'Take a walk', activity_type: 'short', duration: 5 },
            { id: 3, name: 'Quick meditation', activity_type: 'short', duration: 5 },
            { id: 4, name: 'Free time', activity_type: 'long', duration: 15 },
            { id: 5, name: 'Exercise', activity_type: 'long', duration: 30 },
            { id: 6, name: 'Video games', activity_type: 'long', duration: 30 },
            { id: 7, name: 'Watch a show', activity_type: 'long', duration: 30 },
            { id: 8, name: 'Read for fun', activity_type: 'long', duration: 30 }
        ];
        renderBreakActivities();
    }
}

// Render break activities in the UI
function renderBreakActivities() {
    if (!breakActivities || breakActivities.length === 0) {
        activitiesContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>No break activities found. Add your first activity to get started!</p>
            </div>
        `;
        return;
    }
    
    // Group activities by type
    const shortBreakActivities = breakActivities.filter(a => a.activity_type === 'short');
    const longBreakActivities = breakActivities.filter(a => a.activity_type === 'long');
    
    let html = `
        <div class="mb-8">
            <h3 class="text-lg font-medium mb-4">Short Break Activities</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${shortBreakActivities.map(activity => createActivityCard(activity)).join('')}
            </div>
        </div>
        <div>
            <h3 class="text-lg font-medium mb-4">Long Break Activities</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${longBreakActivities.map(activity => createActivityCard(activity)).join('')}
            </div>
        </div>
    `;
    
    activitiesContainer.innerHTML = html;
    
    // Add event listeners to edit/delete buttons
    document.querySelectorAll('.edit-activity').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const activityId = parseInt(btn.dataset.id);
            editActivity(activityId);
        });
    });
    
    document.querySelectorAll('.delete-activity').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const activityId = parseInt(btn.dataset.id);
            deleteActivity(activityId);
        });
    });
}

// Create an activity card HTML
function createActivityCard(activity) {
    return `
        <div class="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-medium text-gray-900">${activity.name}</h4>
                    ${activity.description ? `<p class="text-sm text-gray-500 mt-1">${activity.description}</p>` : ''}
                    <div class="mt-2 flex items-center text-sm text-gray-500">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.activity_type === 'short' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
                            ${activity.activity_type === 'short' ? 'Short Break' : 'Long Break'}
                        </span>
                        <span class="ml-2">${activity.duration || 'Flexible'} min</span>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button class="edit-activity text-blue-600 hover:text-blue-800" data-id="${activity.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-activity text-red-600 hover:text-red-800" data-id="${activity.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Timer settings form
    timerSettingsForm.addEventListener('submit', handleTimerSettingsSubmit);
    
    // Notification settings form
    notificationSettingsForm.addEventListener('submit', handleNotificationSettingsSubmit);
    
    // Add activity button
    addActivityBtn.addEventListener('click', () => openActivityModal());
    
    // Cancel activity button
    cancelActivityBtn.addEventListener('click', () => closeActivityModal());
    
    // Activity form submission
    activityForm.addEventListener('submit', handleActivitySubmit);
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
        auto_start_breaks: formData.get('auto_start_breaks') === 'on',
        auto_start_pomodoros: formData.get('auto_start_pomodoros') === 'on',
        long_break_delay: 15 // Default value, can be made configurable
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
        
        showNotification('Timer settings saved successfully!', 'success');
    } catch (error) {
        console.error('Error updating settings:', error);
        showNotification('Failed to save settings. Please try again.', 'error');
    }
}

// Handle notification settings form submission
function handleNotificationSettingsSubmit(e) {
    e.preventDefault();
    // In a real app, we would save these preferences to the server
    showNotification('Notification settings saved!', 'success');
}

// Open activity modal for adding/editing
function openActivityModal(activity = null) {
    isEditing = activity !== null;
    currentActivityId = activity ? activity.id : null;
    
    // Set modal title
    modalTitle.textContent = isEditing ? 'Edit Activity' : 'Add Break Activity';
    
    // Reset form
    activityForm.reset();
    
    // If editing, populate form with activity data
    if (isEditing) {
        document.getElementById('activity-name').value = activity.name;
        document.getElementById('activity-description').value = activity.description || '';
        document.getElementById('activity-type').value = activity.activity_type || 'short';
        document.getElementById('activity-duration').value = activity.duration || '';
    } else {
        // Set default values for new activity
        document.getElementById('activity-type').value = 'short';
    }
    
    // Show modal
    activityModal.classList.remove('hidden');
}

// Close activity modal
function closeActivityModal() {
    activityModal.classList.add('hidden');
    isEditing = false;
    currentActivityId = null;
}

// Handle activity form submission
async function handleActivitySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(activityForm);
    const activity = {
        name: formData.get('name'),
        description: formData.get('description'),
        activity_type: formData.get('activity_type'),
        duration: formData.get('duration') ? parseInt(formData.get('duration')) : null
    };
    
    try {
        let response;
        
        if (isEditing) {
            // Update existing activity
            response = await fetch(`/api/break-activities/${currentActivityId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(activity)
            });
        } else {
            // Create new activity
            response = await fetch('/api/break-activities/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(activity)
            });
        }
        
        if (!response.ok) {
            throw new Error('Failed to save activity');
        }
        
        // Reload activities
        await loadBreakActivities();
        closeActivityModal();
        showNotification(`Activity ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
    } catch (error) {
        console.error('Error saving activity:', error);
        showNotification('Failed to save activity. Please try again.', 'error');
    }
}

// Edit an existing activity
function editActivity(activityId) {
    const activity = breakActivities.find(a => a.id === activityId);
    if (activity) {
        openActivityModal(activity);
    }
}

// Delete an activity
async function deleteActivity(activityId) {
    if (!confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/break-activities/${activityId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete activity');
        }
        
        // Reload activities
        await loadBreakActivities();
        showNotification('Activity deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting activity:', error);
        showNotification('Failed to delete activity. Please try again.', 'error');
    }
}

// Show a notification to the user
function showNotification(message, type = 'info') {
    // In a real app, you might use a more sophisticated notification system
    alert(`${type.toUpperCase()}: ${message}`);
}
