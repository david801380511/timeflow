// Global variables
const userPreferences = {
    preferredMethod: 'pomodoro',
    completedSessions: 0,
    sessionHistory: [],
    musicEnabled: true,
    volume: 0.5,
    customMethods: {}
};

// DOM Elements
const timeMethodSelect = document.getElementById('time-method-select');
const methodDetails = document.getElementById('method-details');
const methodDescription = document.getElementById('method-description');
const methodParams = document.getElementById('method-params');
const recommendedMethod = document.getElementById('recommended-method');
const recommendationBadge = document.getElementById('recommendation-badge');
const methodTips = document.getElementById('method-tips');

/**
 * Update method UI based on selection
 */
function updateMethodUI(methodId) {
    const method = window.timeMethods?.[methodId];
    if (!method) return;
    
    if (methodDescription) {
        methodDescription.textContent = method.description || '';
    }
    
    // Update parameters display if needed
    updateMethodParams(methodId);
    
    // Update tips if needed
    updateMethodTips(methodId);
}

/**
 * Update method parameters in the UI
 */
function updateMethodParams(methodId) {
    const method = window.timeMethods?.[methodId];
    if (!method || !methodParams) return;
    
    methodParams.innerHTML = `
        <div class="grid grid-cols-3 gap-4">
            <div>
                <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Work</div>
                <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${method.workDuration}m</div>
            </div>
            <div>
                <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Short Break</div>
                <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${method.shortBreak}m</div>
            </div>
            <div>
                <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Long Break</div>
                <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${method.longBreak}m</div>
            </div>
        </div>
    `;
}

/**
 * Update method tips in the UI
 */
function updateMethodTips(methodId) {
    const tips = {
        'pomodoro': [
            'Use a physical timer for a more tangible experience',
            'Take a short walk during breaks to refresh your mind',
            'After 4 pomodoros, take a longer 15-30 minute break'
        ],
        '52-17': [
            'Use the longer work period for deep focus tasks',
            'The 17-minute break is great for a short walk or light stretching',
            'This method is based on studies of highly productive people'
        ],
        'flowtime': [
            'Start with shorter work periods and gradually increase',
            'Take breaks when you feel your focus waning',
            'Track your natural productivity cycles to optimize your schedule'
        ],
        'ultradian': [
            'Use the 90-minute blocks for deep work sessions',
            'Take a complete break from screens during your 20-30 minute breaks',
            'This method aligns with your body\'s natural energy cycles'
        ],
        'custom': [
            'Adjust the work and break durations to match your personal rhythm',
            'Experiment to find what works best for your focus and energy levels',
            'Consider tracking your productivity to optimize your custom schedule'
        ]
    };
    
    if (methodTips) {
        const tipList = tips[methodId] || tips['pomodoro'];
        methodTips.innerHTML = tipList
            .map(tip => `<li class="flex items-start">
                <svg class="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>${tip}</span>
            </li>`)
            .join('');
    }
}

/**
 * Initialize time method selector
 */
function initTimeMethodSelector() {
    if (!timeMethodSelect) return;
    
    // Clear existing options
    timeMethodSelect.innerHTML = '';
    
    // Add options from timeMethods
    Object.entries(window.timeMethods).forEach(([id, method]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = method.displayName || method.name;
        timeMethodSelect.appendChild(option);
    });
    
    // Set initial value
    timeMethodSelect.value = userPreferences.preferredMethod || 'pomodoro';
    
    // Add change event listener
    timeMethodSelect.addEventListener('change', function() {
        const methodId = this.value;
        updateMethodUI(methodId);
        
        // Update timer settings if the function exists
        if (typeof window.updateTimerWithMethod === 'function') {
            window.updateTimerWithMethod(methodId);
        }
        
        // Save preference
        userPreferences.preferredMethod = methodId;
        saveUserPreferences();
    });
    
    // Initial UI update
    updateMethodUI(timeMethodSelect.value);
}

/**
 * Save user preferences to localStorage
 */
function saveUserPreferences() {
    try {
        localStorage.setItem('timeflow_preferences', JSON.stringify(userPreferences));
    } catch (e) {
        console.error('Error saving preferences:', e);
    }
}

/**
 * Load user preferences from localStorage
 */
function loadUserPreferences() {
    try {
        const saved = localStorage.getItem('timeflow_preferences');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(userPreferences, parsed);
            
            // Update UI if needed
            if (timeMethodSelect && userPreferences.preferredMethod) {
                timeMethodSelect.value = userPreferences.preferredMethod;
                updateMethodUI(userPreferences.preferredMethod);
            }
        }
    } catch (e) {
        console.error('Error loading preferences:', e);
    }
}

/**
 * Initialize music player
 */
function initMusicPlayer() {
    // This is handled by music-player.js
    console.log('Music player initialized');
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Add any additional event listeners here
    document.addEventListener('keydown', function(e) {
        // Add keyboard shortcuts if needed
    });
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load user preferences
    loadUserPreferences();
    
    // Initialize components
    initTimeMethodSelector();
    initMusicPlayer();
    initEventListeners();
    
    // Load custom stations
    loadCustomStations();
    
    // Initialize with default method
    const defaultMethod = userPreferences.preferredMethod || 'pomodoro';
    updateMethodUI(defaultMethod);
    
    // Initialize volume control if it exists
    const volumeControl = document.getElementById('volume');
    if (volumeControl && typeof updateVolume === 'function') {
        updateVolume({ target: volumeControl });
    }
    
    // Call recommendMethod if it exists
    if (typeof recommendMethod === 'function') {
        recommendMethod();
    }
});

/**
 * Initialize music player functionality
 */
function initMusicPlayer() {
    // Set initial volume
    const volumeControl = document.getElementById('volume');
    if (volumeControl && typeof updateVolume === 'function') {
        volumeControl.value = (userPreferences.volume || 0.5) * 100;
        updateVolume({ target: volumeControl });
    }
    
    // Update mute button state
    updateMuteButton();
    
    // Initialize stations
    updateStationsUI();
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Volume control
    const volumeControl = document.getElementById('volume');
    if (volumeControl) {
        volumeControl.addEventListener('input', updateVolume);
    }
    
    // Mute button
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }
    
    // Play/Pause button
    const playPauseBtn = document.getElementById('play-pause');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }
    
    // Previous/Next track buttons
    const prevBtn = document.getElementById('prev-track');
    const nextBtn = document.getElementById('next-track');
    
    if (prevBtn) prevBtn.addEventListener('click', playPreviousTrack);
    if (nextBtn) nextBtn.addEventListener('click', playNextTrack);
    
    // Refresh stations button
    const refreshBtn = document.getElementById('refresh-stations');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', updateStationsUI);
    }
    
    // Add station button
    const addStationBtn = document.getElementById('add-station');
    if (addStationBtn) {
        addStationBtn.addEventListener('click', showAddStationModal);
    }
    
    // Station click handlers
    document.addEventListener('click', function(e) {
        const stationElement = e.target.closest('.radio-station');
        if (stationElement) {
            const stationId = stationElement.dataset.id;
            if (stationId) {
                playStation(stationId);
            }
        }
    });
}

/**
 * Update the stations UI based on the current stations array
 */
function updateStationsUI() {
    const stationsContainer = document.getElementById('radio-stations');
    if (!stationsContainer) return;
    
    stationsContainer.innerHTML = stations.map(station => `
        <div class="radio-station p-3 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer 
                     hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${currentStation?.id === station.id ? 'ring-2 ring-indigo-500' : ''}" 
             data-id="${station.id}">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <img src="${station.cover}" alt="${station.title}" class="w-full h-full object-cover" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6bS01LjUtNC4yNWwtMS.45LTEuNDVjLS4yNS0uMzEtLjE5LS43NS4xMi0xLjAxLjMxLS4yNS43NS0uMTkgMS4wMS4xMmwxLjI0IDEuNTYgMy4wNC0zLjc1Yy4yLS4yNS41OC0uMzEuODktLjE5LjMxLjEyLjUxLjQyLjUxLjc1djQuNWMwIC40MS0uMzQuNzUtLjc1Ljc1aC0uNWMtLjQxIDAtLjc1LS4zNC0uNzUtLjc1di0yLjM4bC0yLjgxIDMuNTJ6Ii8+PC9zdmc+'">
                    </div>
                    <div>
                        <div class="font-medium text-gray-900 dark:text-white">${station.title}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">${station.description}</div>
                    </div>
                </div>
                <div class="flex items-center">
                    <button class="p-1 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" 
                            onclick="event.stopPropagation(); removeStation('${station.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Show the add station modal
 */
function showAddStationModal() {
    // In a real app, this would show a modal for adding a new station
    // For now, we'll just log to the console
    console.log('Show add station modal');
    
    // Example of how to add a station programmatically:
    /*
    const newStation = {
        id: 'custom-' + Date.now(),
        title: 'Custom Station',
        description: 'Your custom station',
        url: 'https://example.com/stream',
        cover: 'https://via.placeholder.com/150'
    };
    
    stations.push(newStation);
    updateStationsUI();
    saveStationsToStorage();
    */
}

/**
 * Remove a station from the list
 * @param {string} stationId - The ID of the station to remove
 */
function removeStation(stationId) {
    const index = stations.findIndex(s => s.id === stationId);
    if (index !== -1) {
        // Don't allow removing default stations
        if (['lofi-girl', 'cat-lofi', 'peaceful-knight'].includes(stationId)) {
            alert('Default stations cannot be removed');
            return;
        }
        
        stations.splice(index, 1);
        updateStationsUI();
        saveStationsToStorage();
    }
}

/**
 * Save stations to localStorage
 */
function saveStationsToStorage() {
    try {
        const customStations = stations.filter(s => !s.isDefault);
        localStorage.setItem('timeflow_custom_stations', JSON.stringify(customStations));
    } catch (e) {
        console.error('Error saving stations:', e);
    }
}

/**
 * Load custom stations from localStorage
 */
function loadCustomStations() {
    try {
        const savedStations = localStorage.getItem('timeflow_custom_stations');
        if (savedStations) {
            const customStations = JSON.parse(savedStations);
            // Add custom stations to the stations array, avoiding duplicates
            customStations.forEach(station => {
                if (!stations.some(s => s.id === station.id)) {
                    stations.push(station);
                }
            });
        }
    } catch (e) {
        console.error('Error loading custom stations:', e);
    }
}

// Make functions available globally
window.updateMethodUI = updateMethodUI;
window.updateCustomParam = updateCustomParam;
window.switchToMethod = switchToMethod;
window.playStation = playStation;
window.togglePlayPause = togglePlayPause;
window.playNextTrack = playNextTrack;
window.playPreviousTrack = playPreviousTrack;
window.removeStation = removeStation;
