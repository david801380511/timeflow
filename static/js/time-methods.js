// Time Management Methods Configuration
const timeMethods = {
    'pomodoro': {
        name: 'Pomodoro',
        description: 'Work for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer 15-30 minute break.',
        workDuration: 25, // in minutes
        shortBreak: 5,    // in minutes
        longBreak: 15,    // in minutes
        intervals: 4,     // Number of work intervals before long break
        color: 'indigo',
        icon: 'fa-clock'
    },
    '52-17': {
        name: '52-17',
        description: 'Work for 52 minutes, then take a 17-minute break. Based on productivity research showing optimal work/rest cycles.',
        workDuration: 52,  // in minutes
        shortBreak: 17,    // in minutes
        longBreak: 30,     // in minutes
        intervals: 2,
        color: 'blue',
        icon: 'fa-hourglass-half'
    },
    'flowtime': {
        name: 'Flowtime',
        description: 'Work in flexible time blocks based on your natural flow state. Take breaks when you feel your focus waning.',
        workDuration: 45,  // in minutes
        shortBreak: 15,    // in minutes
        longBreak: 30,     // in minutes
        intervals: 3,
        color: 'purple',
        icon: 'fa-infinity'
    },
    'ultradian': {
        name: 'Ultradian Rhythms',
        description: 'Work in 90-minute cycles followed by 20-30 minute breaks, aligned with your body\'s natural energy cycles.',
        workDuration: 90,  // in minutes
        shortBreak: 20,    // in minutes
        longBreak: 30,     // in minutes
        intervals: 2,
        color: 'green',
        icon: 'fa-wave-square'
    }
};

// DOM Elements
const timeMethodSelect = document.getElementById('time-method-select');
const methodDetails = document.getElementById('method-details');
const methodDescription = document.getElementById('method-description');
const methodParams = document.getElementById('method-params');
const recommendedMethod = document.getElementById('recommended-method');
const recommendationReason = document.getElementById('recommendation-reason');

// Music Player State
let currentStation = null;
let isPlaying = false;
const stations = [
    {
        id: 'lofi-girl',
        title: 'Lofi Girl',
        description: 'lofi hip hop radio - beats to relax/study to',
        videoId: 'jfKfPfyJRdk',
        cover: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg'
    },
    {
        id: 'chillhop',
        title: 'Chillhop Radio',
        description: 'jazzy & lofi hip hop beats',
        videoId: 'rUxyKA_qgr8',
        cover: 'https://i.ytimg.com/vi/rUxyKA_qgr8/hqdefault.jpg'
    },
    {
        id: 'coffee-shop',
        title: 'Coffee Shop Radio',
        description: 'cozy coffee shop ambience',
        videoId: 'DWcJFNfaw9c',
        cover: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg'
    }
];

// Play a station
function playStation(stationId) {
    const station = stations.find(s => s.id === stationId);
    if (!station) {
        console.error('Station not found:', stationId);
        return;
    }
    
    console.log('Playing station:', station);
    currentStation = station;
    isPlaying = true;
    
    // Update UI
    updateNowPlaying(station);
    updatePlayPauseButton();
    
    // Get or create the YouTube iframe container
    const youtubeContainer = document.getElementById('youtube-player-container');
    if (!youtubeContainer) {
        console.error('YouTube container not found');
        return;
    }
    
    // Create or update the YouTube iframe
    let iframe = youtubeContainer.querySelector('iframe');
    
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        document.getElementById('youtube-iframe').appendChild(iframe);
    }
    
    // Set the source with autoplay and enable jsapi
    const videoId = station.videoId || 'jfKfPfyJRdk'; // Default to Lofi Girl if no videoId
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=0`;
    youtubeContainer.classList.remove('hidden');
    
    // Store the iframe in a global variable for control
    window.currentYouTubePlayer = iframe;
    
    console.log('Now playing:', station.title);
}

// Toggle play/pause for YouTube player
function toggleYouTubePlayback() {
    if (!currentStation) return;
    
    isPlaying = !isPlaying;
    updatePlayPauseButton();
    
    const iframe = document.getElementById('youtube-iframe');
    if (iframe && iframe.contentWindow) {
        if (isPlaying) {
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        } else {
            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
    }
}

// Update the now playing display
function updateNowPlaying(station) {
    const nowPlaying = document.getElementById('now-playing');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    
    if (!nowPlaying || !trackTitle || !trackArtist) return;
    
    // Update the mini player
    nowPlaying.innerHTML = `
        <div class="flex items-center space-x-3">
            <img src="${station.cover}" alt="${station.title}" class="w-12 h-12 rounded">
            <div class="min-w-0">
                <div class="font-medium text-gray-900 dark:text-white truncate">${station.title}</div>
                <div class="text-sm text-gray-500 dark:text-gray-400 truncate">${station.description}</div>
            </div>
        </div>
    `;
    
    // Also update the track info in the main player
    trackTitle.textContent = station.title;
    trackArtist.textContent = station.description;
}

// Update play/pause button
function updatePlayPauseButton() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (!playPauseBtn) return;
    
    const icon = playPauseBtn.querySelector('i');
    if (!icon) return;
    
    if (isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        playPauseBtn.setAttribute('title', 'Pause');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        playPauseBtn.setAttribute('title', 'Play');
    }
}

// Initialize the music player
function initMusicPlayer() {
    console.log('Initializing music player...');
    
    // Set up play/pause button
    if (playPauseBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newPlayPauseBtn = playPauseBtn.cloneNode(true);
        playPauseBtn.parentNode.replaceChild(newPlayPauseBtn, playPauseBtn);
        
        // Add click handler to the new button
        newPlayPauseBtn.addEventListener('click', togglePlayPause);
        
        // Update the reference
        window.playPauseBtn = newPlayPauseBtn;
        
        console.log('Play/pause button event listener added');
        
        // Set initial play/pause button state
        updatePlayPauseButton();
    } else {
        console.warn('Play/pause button not found');
    }
    
    // Set up volume control
    const volumeControl = document.getElementById('volume');
    if (volumeControl) {
        volumeControl.addEventListener('input', (e) => {
            const volume = e.target.value;
            const iframe = document.getElementById('youtube-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${volume * 100}]}`, '*');
            }
        });
        console.log('Volume control event listener added');
    }
    
    // Set up radio stations
    const radioStations = document.querySelectorAll('.radio-station');
    if (radioStations.length > 0) {
        console.log('Found', radioStations.length, 'radio stations');
        
        // Add click handlers to each station
        radioStations.forEach((station) => {
            station.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Get the station ID from data-id attribute
                const stationId = station.getAttribute('data-id');
                console.log('Station clicked:', stationId);
                
                if (stationId) {
                    // Update active station UI
                    radioStations.forEach(s => s.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20'));
                    station.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20');
                    
                    // Play the station
                    playStation(stationId);
                }
            });
        });
        
        // Auto-play the first station after a short delay
        setTimeout(() => {
            if (radioStations.length > 0) {
                radioStations[0].click();
            }
        }, 1000);
    } else {
        console.warn('No radio stations found in the DOM');
    }
    
    // Set up close button for YouTube player
    const closeBtn = document.getElementById('close-youtube');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const youtubeContainer = document.getElementById('youtube-player-container');
            if (youtubeContainer) {
                youtubeContainer.classList.add('hidden');
                
                // Pause the video when closing
                const iframe = document.getElementById('youtube-iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                }
                
                isPlaying = false;
                updatePlayPauseButton();
            }
        });
    }
}
const audioPlayer = document.getElementById('audio-player');
const volumeControl = document.getElementById('volume');
const muteBtn = document.getElementById('mute-btn');
const playPauseBtn = document.getElementById('start-pause'); // Updated to match HTML ID
const toggleSettingsBtn = document.getElementById('toggle-music-settings');
const musicSettings = document.getElementById('music-settings');

// Toggle settings panel
if (toggleSettingsBtn && musicSettings) {
    toggleSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        musicSettings.classList.toggle('hidden');
    });

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (!musicSettings.contains(e.target) && e.target !== toggleSettingsBtn) {
            musicSettings.classList.add('hidden');
        }
    });
}

// Initialize volume from localStorage
let currentVolume = parseFloat(localStorage.getItem('volume') || '0.5');
let isMuted = localStorage.getItem('isMuted') === 'true';

// Initialize audio context and set up volume control
async function initializeAudio() {
    try {
        await initAudioContext();
        if (volumeControl) {
            volumeControl.value = currentVolume;
            updateVolume({ target: { value: currentVolume } });
        }
    } catch (error) {
        console.warn('Error initializing audio:', error);
    }
}

// Start audio initialization when user interacts with the page
const startAudio = () => {
    document.removeEventListener('click', startAudio);
    document.removeEventListener('keydown', startAudio);
    initializeAudio();
};

document.addEventListener('click', startAudio);
document.addEventListener('keydown', startAudio);

// Handle volume change
function handleVolumeChange(e) {
    try {
        const volume = parseFloat(e.target.value);
        const iframe = document.getElementById('youtube-iframe');
        
        // Update YouTube iframe volume if it exists
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${volume * 100}]}`, '*');
        }
        
        // Update mute state based on volume
        isMuted = volume <= 0;
        updateMuteButton();
        
        // Save volume preference
        localStorage.setItem('volume', volume);
    } catch (error) {
        console.warn('Error updating volume:', error);
    }
}
const radioStations = document.querySelectorAll('.radio-station');

// Music player state
let pauseTime = 0;
let audioContext;
let audioSource = null; // Add audioSource to global state

// Initialize audio context
async function initAudioContext() {
    try {
        // Check if we already have an audio context
        if (audioContext) {
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            return audioContext;
        }
        
        // Create cross-browser audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn('Web Audio API is not supported in this browser');
            return null;
        }
        
        audioContext = new AudioContext();
        
        // Handle iOS autoplay policy
        if (audioContext.state === 'suspended') {
            const resumeAudio = async () => {
                try {
                    await audioContext.resume();
                    console.log('Audio context resumed successfully');
                } catch (error) {
                    console.warn('Error resuming audio context:', error);
                }
            };
            
            // Set up user interaction to resume audio context
            const interactionEvents = ['click', 'touchstart', 'keydown'];
            const onUserInteraction = async () => {
                for (const event of interactionEvents) {
                    document.removeEventListener(event, onUserInteraction);
                }
                await resumeAudio();
            };
            
            for (const event of interactionEvents) {
                document.addEventListener(event, onUserInteraction, { once: true });
            }
        }
        
        console.log('Audio context initialized');
        return audioContext;
    } catch (error) {
        console.error('Error initializing audio context:', error);
        return null;
    }
}

// Update volume
function updateVolume(e) {
    try {
        const volume = e && e.target ? parseFloat(e.target.value) : parseFloat(volumeControl?.value || 0.5);
        const iframe = document.getElementById('youtube-iframe');
        
        // Update YouTube iframe volume if it exists
        if (iframe && iframe.contentWindow) {
            const volumeValue = isMuted ? 0 : volume;
            iframe.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${volumeValue * 100}]}`, '*');
        }
        
        // Update Web Audio API volume if available
        if (audioContext) {
            const gainNode = audioContext.createGain();
            gainNode.gain.value = isMuted ? 0 : volume;
            // Connect the gain node to your audio graph here if needed
        }
        
        // Update volume control value
        if (volumeControl) {
            volumeControl.value = volume;
        }
        
        // Update mute state based on volume
        isMuted = volume <= 0;
        updateMuteButton();
        
        // Save volume preference
        localStorage.setItem('volume', volume);
        
    } catch (error) {
        console.warn('Error updating volume:', error);
    }
}

// Toggle mute state
function toggleMute() {
    isMuted = !isMuted;
    
    // Save mute state
    localStorage.setItem('isMuted', isMuted);
    
    // Update volume with current mute state
    updateVolume({ target: { value: volumeControl?.value || 0.5 } });
}

// Update mute button appearance
function updateMuteButton() {
    if (!muteBtn) return;
    
    const icon = muteBtn.querySelector('i');
    if (!icon) return;
    
    if (isMuted || (volumeControl && parseFloat(volumeControl.value) <= 0)) {
        icon.className = 'fas fa-volume-mute';
        muteBtn.setAttribute('title', 'Unmute');
    } else {
        icon.className = 'fas fa-volume-up';
        muteBtn.setAttribute('title', 'Mute');
    }
}
let animationFrameId;

// Sample playlist (in a real app, this would come from the backend)
let playlist = [
    { id: 1, title: 'Focus Flow', artist: 'Study Music Ensemble', duration: '3:45', url: '/static/audio/focus-flow.mp3' },
    { id: 2, title: 'Deep Concentration', artist: 'Brainwave Studio', duration: '4:20', url: '/static/audio/deep-concentration.mp3' },
    { id: 3, title: 'Study Session', artist: 'Focus Tracks', duration: '5:10', url: '/static/audio/study-session.mp3' },
];

// Initialize the application
function init() {
    console.log('Initializing application...');
    
    try {
        // Initialize audio context
        initAudioContext();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load user preferences
        loadUserPreferences();
        
        // Initialize timer display
        updateTimerDisplay();
        
        // Initialize timer with default method if none selected
        if (timeMethodSelect && timeMethodSelect.value) {
            handleMethodChange({ target: timeMethodSelect });
        } else if (timeMethodSelect && timeMethodSelect.options.length > 0) {
            timeMethodSelect.value = timeMethodSelect.options[0].value;
            handleMethodChange({ target: timeMethodSelect });
        }
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Time method selection
    if (timeMethodSelect) {
        timeMethodSelect.addEventListener('change', handleMethodChange);
    }
    
    // Start/Pause button for timer
    const startPauseBtn = document.getElementById('start-pause');
    if (startPauseBtn) {
        startPauseBtn.addEventListener('click', () => {
            if (window.timerInterval) {
                // Pause timer
                clearInterval(window.timerInterval);
                window.timerInterval = null;
                startPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
            } else {
                // Start timer
                window.timerInterval = setInterval(() => {
                    if (window.updateTimerDisplay) {
                        window.updateTimerDisplay();
                    }
                }, 1000);
                startPauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
            }
        });
    }
    
    // Reset button for timer
    const resetBtn = document.getElementById('reset-timer');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (window.timerInterval) {
                clearInterval(window.timerInterval);
                window.timerInterval = null;
            }
            if (startPauseBtn) {
                startPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
            }
            // Reset timer display to current method's work duration
            if (timeMethodSelect && timeMethodSelect.value) {
                handleMethodChange({ target: timeMethodSelect });
            }
        });
    }
    
    // Music player controls
    if (volumeControl) {
        volumeControl.addEventListener('input', updateVolume);
    }
    
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }
    
    // Close YouTube player
    const closeYoutubeBtn = document.getElementById('close-youtube');
    if (closeYoutubeBtn) {
        closeYoutubeBtn.addEventListener('click', () => {
            const youtubeContainer = document.getElementById('youtube-player-container');
            if (youtubeContainer) {
                youtubeContainer.classList.add('hidden');
                
                // Pause the video when closing
                const iframe = document.getElementById('youtube-iframe');
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                }
                
                isPlaying = false;
                updatePlayPauseButton();
            }
        });
    }
    
    // Set up radio station click handlers
    const radioStations = document.querySelectorAll('.radio-station');
    radioStations.forEach(station => {
        station.addEventListener('click', () => {
            const stationId = station.getAttribute('data-id');
            if (stationId) {
                playStation(stationId);
            }
        });
    });
}

// Handle method selection change
function handleMethodChange(event) {
    const methodId = event.target.value;
    if (!methodId) return;
    
    const method = timeMethods[methodId];
    if (!method) {
        console.error('Method not found:', methodId);
        return;
    }
    
    console.log('Method changed to:', methodId, method);
    
    // Save the selected method
    saveUserPreference('selectedMethod', methodId);
    
    // Update the timer with the new method
    updateTimerWithMethod(methodId);
    
    // Update method details
    if (methodDescription) {
        methodDescription.textContent = method.description;
    }
    
    // Update method parameters
    if (methodParams) {
        methodParams.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Duration (minutes)</label>
                    <input type="number" value="${method.workDuration / 60}" 
                           onchange="window.timeMethodsJS.updateMethodParam('${methodId}', this)" 
                           data-param="workDuration"
                           class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                           min="1" step="1">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Short Break (minutes)</label>
                    <input type="number" value="${method.shortBreak / 60}" 
                           onchange="window.timeMethodsJS.updateMethodParam('${methodId}', this)"
                           data-param="shortBreak"
                           class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                           min="1" step="1">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Long Break (minutes)</label>
                    <input type="number" value="${method.longBreak / 60}" 
                           onchange="window.timeMethodsJS.updateMethodParam('${methodId}', this)"
                           data-param="longBreak"
                           class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                           min="1" step="1">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Intervals</label>
                    <input type="number" value="${method.intervals}" 
                           onchange="window.timeMethodsJS.updateMethodParam('${methodId}', this)"
                           data-param="intervals"
                           class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                           min="1" step="1">
                </div>
            </div>
        `;
    }
    
    // Save the selected method first
    saveUserPreference('selectedMethod', methodId);
    
    // Update the timer with the new method settings
    updateTimerWithMethod(methodId);
    
    // Update the timer status to show the current method
    const timerStatus = document.getElementById('timer-status');
    if (timerStatus) {
        timerStatus.textContent = method.name;
        const colorClass = `bg-${method.color}-100 dark:bg-${method.color}-900 text-${method.color}-700 dark:text-${method.color}-300`;
        timerStatus.className = `px-3 py-1 rounded-full text-sm font-medium ${colorClass}`;
    }
    
    // Force a UI update
    if (window.timer && typeof window.timer.updateDisplay === 'function') {
        window.timer.updateDisplay();
    }
    
    // Update the current phase display
    const currentPhase = document.getElementById('current-phase');
    if (currentPhase) {
        currentPhase.textContent = 'Ready';
    }
    
    // Save preference
    saveUserPreference('timeMethod', methodId);
    
    console.log('Method updated successfully');
}

// Update a method parameter
function updateMethodParam(methodId, input) {
    const param = input.dataset.param;
    const multiplier = parseInt(input.dataset.multiplier) || 1;
    const value = parseInt(input.value) * multiplier;
    
    // Update the method configuration
    timeMethods[methodId][param] = value;
    
    // Update the timer if this is the current method
    if (timeMethodSelect.value === methodId) {
        updateTimerWithMethod(methodId);
    }
    
    // Save updated preferences
    saveUserPreference('timeMethods', timeMethods);
}

// Update timer with method settings
function updateTimerWithMethod(methodId) {
    console.log('Updating timer with method:', methodId);
    const method = timeMethods[methodId];
    if (!method) {
        console.error('Method not found for update:', methodId);
        return;
    }
    
    // Store current method globally
    window.currentMethod = method;
    
    // Convert minutes to seconds for the timer
    const timerSettings = {
        workDuration: method.workDuration * 60,    // Convert minutes to seconds
        shortBreak: method.shortBreak * 60,        // Convert minutes to seconds
        longBreak: method.longBreak * 60,          // Convert minutes to seconds
        intervals: method.intervals
    };
    
    console.log('Updating timer with settings:', timerSettings);
    
    // Update the timer with new settings
    if (typeof window.updateTimerSettings === 'function') {
        window.updateTimerSettings(timerSettings);
    } 
    
    // Also try to update through the timer instance directly
    if (window.timer) {
        // If we have direct access to the timer, update its properties
        window.timer.workTime = timerSettings.workDuration;
        window.timer.breakTime = timerSettings.shortBreak;
        window.timer.longBreakTime = timerSettings.longBreak;
        window.timer.intervals = timerSettings.intervals;
        
        // Reset the timer with new settings if not running
        if (!window.timer.isRunning) {
            window.timer.resetTimer();
        }
    }
    
    // If timer is not running, update the display
    if (window.isRunning !== true) {
        const timerDisplay = document.getElementById('time-display') || document.getElementById('timer');
        if (timerDisplay) {
            const minutes = Math.floor(timerSettings.workDuration / 60);
            const seconds = 0;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    // Update the UI to reflect the current method
    const root = document.documentElement;
    root.style.setProperty('--color-primary', `var(--${method.color}-600)`);
    root.style.setProperty('--color-primary-dark', `var(--${method.color}-700)`);
    root.style.setProperty('--color-primary-light', `var(--${method.color}-100)`);
    
    // Update the timer status
    const timerStatus = document.getElementById('timer-status');
    if (timerStatus) {
        timerStatus.textContent = method.name;
        timerStatus.className = `px-3 py-1 bg-${method.color}-100 dark:bg-${method.color}-900 text-${method.color}-700 dark:text-${method.color}-300 rounded-full text-sm font-medium`;
    }
    
    // Update the current phase
    const currentPhaseEl = document.getElementById('current-phase');
    if (currentPhaseEl) {
        currentPhaseEl.textContent = 'Ready';
    }
    
    console.log('Timer updated with new method settings');
}

// Load user preferences
function loadUserPreferences() {
    try {
        // Load volume
        const savedVolume = localStorage.getItem('volume');
        if (savedVolume !== null && volumeControl) {
            const volume = Math.min(1, Math.max(0, parseFloat(savedVolume) || 0.5));
            volumeControl.value = volume;
            // The volume will be applied when the player initializes
        }
        
        // Load mute state
        const savedMute = localStorage.getItem('isMuted');
        if (savedMute === 'true') {
            isMuted = true;
            updateMuteButton();
        }
        
        // Load time method preferences
        const savedMethod = localStorage.getItem('preferredTimeMethod') || 'pomodoro';
        const savedMethods = JSON.parse(localStorage.getItem('timeMethods') || '{}');
        
        // Merge saved methods with defaults
        Object.entries(savedMethods).forEach(([key, value]) => {
            if (timeMethods[key]) {
                timeMethods[key] = { ...timeMethods[key], ...value };
            }
        });
        
        // Set the selected method
        if (timeMethodSelect) {
            timeMethodSelect.value = savedMethod;
            if (savedMethod) {
                timeMethodSelect.dispatchEvent(new Event('change'));
            }
        }
        
        console.log('User preferences loaded');
    } catch (error) {
        console.warn('Error loading user preferences:', error);
    }
}

// Save user preference
function saveUserPreference(key, value) {
    try {
        if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
        } else {
            localStorage.setItem(key, value);
        }
    } catch (e) {
        console.error('Failed to save preference:', e);
    }
}

// Recommend a time management method
function recommendMethod() {
    // In a real app, this would be based on user behavior and preferences
    const recommended = 'pomodoro'; // Default recommendation
    const reasons = {
        pomodoro: 'Great for maintaining focus with regular breaks',
        '52-17': 'Ideal for deep work sessions',
        flowtime: 'Perfect for when you\'re in the zone',
        ultradian: 'Best for aligning with your natural energy cycles'
    };
    
    // Only show recommendation if not already using this method
    if (timeMethodSelect.value !== recommended) {
        recommendationReason.textContent = reasons[recommended] || '';
        recommendedMethod.classList.remove('hidden');
        
        // Add click handler to apply the recommendation
        recommendedMethod.onclick = () => {
            timeMethodSelect.value = recommended;
            timeMethodSelect.dispatchEvent(new Event('change'));
            recommendedMethod.classList.add('hidden');
        };
    } else {
        recommendedMethod.classList.add('hidden');
    }
}

// Unified play/pause function
function togglePlayPause() {
    if (!playPauseBtn) return;
    
    if (currentStation) {
        // Handle YouTube playback
        toggleYouTubePlayback();
    } else {
        // Handle local audio playback (if implemented)
        if (isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    }
    
    // Save play state to localStorage
    if (isPlaying) {
        localStorage.setItem('isPlaying', 'true');
    } else {
        localStorage.removeItem('isPlaying');
    }
}

async function playAudio() {
    if (currentTrackIndex === -1 && playlist.length > 0) {
        currentTrackIndex = 0;
        await loadTrack(playlist[currentTrackIndex]);
    }
    
    if (!audioBuffer) return;
    
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    const now = audioContext.currentTime;
    
    if (audioSource) {
        audioSource.stop();
    }
    
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(audioContext.destination);
    
    startTime = now - (pauseTime || 0);
    audioSource.start(0, pauseTime || 0);
    
    audioSource.onended = () => {
        playNextTrack();
    };
    
    isPlaying = true;
    updatePlayPauseButton();
    updateProgressBar();
}

function pauseAudio() {
    if (!isPlaying) return;
    
    pauseTime = audioContext.currentTime - startTime;
    audioSource.stop();
    isPlaying = false;
    updatePlayPauseButton();
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

async function loadTrack(track) {
    try {
        trackTitle.textContent = track.title;
        trackArtist.textContent = track.artist;
        trackDurationEl.textContent = track.duration;
        
        // In a real app, you would fetch the audio file from the server
        // const response = await fetch(track.url);
        // const arrayBuffer = await response.arrayBuffer();
        // audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // For demo purposes, we'll just update the UI
        console.log(`Loading track: ${track.title}`);
        
        // Reset progress
        progressBar.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        
        return true;
    } catch (error) {
        console.error('Error loading track:', error);
        return false;
    }
}

function playNextTrack() {
    if (playlist.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    pauseTime = 0;
    
    if (isPlaying) {
        playAudio();
    } else {
        loadTrack(playlist[currentTrackIndex]);
    }
}

function playPreviousTrack() {
    if (playlist.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    pauseTime = 0;
    
    if (isPlaying) {
        playAudio();
    } else {
        loadTrack(playlist[currentTrackIndex]);
    }
}

function updateVolume(e) {
    try {
        const volume = e && e.target ? parseFloat(e.target.value) : parseFloat(volumeControl?.value || 0.5);
        
        // Ensure audio context is initialized
        if (!audioContext || audioContext.state === 'closed') {
            initAudioContext();
        }
        
        // Update YouTube iframe volume if it exists
        const iframe = document.getElementById('youtube-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${volume * 100}]}`, '*');
        }
        
        // Update audio context volume if available
        if (audioContext) {
            try {
                const gainNode = audioContext.createGain();
                gainNode.gain.value = volume;
                
                // Only try to update connections if we have a valid source
                if (audioSource && audioContext.state === 'running') {
                    audioSource.disconnect();
                    audioSource.connect(gainNode).connect(audioContext.destination);
                }
            } catch (error) {
                console.warn('Error updating audio context:', error);
            }
        }
        
        // Update mute state based on volume
        isMuted = volume <= 0;
        updateMuteButton();
        
        // Save volume preference
        localStorage.setItem('volume', volume);
    } catch (error) {
        console.warn('Error updating volume:', error);
    }
    
    // Save volume preference
    saveUserPreference('volume', volumeControl.value);
}

function updateProgressBar() {
    if (!isPlaying) return;
    
    const currentTime = audioContext.currentTime - startTime;
    const duration = audioBuffer ? audioBuffer.duration : 60; // Default to 60s if no buffer
    const progress = (currentTime / duration) * 100;
    
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    
    // Update current time display
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    currentTimeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Continue the animation
    animationFrameId = requestAnimationFrame(updateProgressBar);
}

function updatePlayPauseButton() {
    if (!playPauseBtn) return; // Skip if button doesn't exist
    
    const icon = playPauseBtn.querySelector('i');
    if (isPlaying) {
        icon?.classList.remove('fa-play');
        icon?.classList.add('fa-pause');
    } else {
        icon?.classList.remove('fa-pause');
        icon?.classList.add('fa-play');
    }
    
    // Update button title for accessibility
    playPauseBtn.setAttribute('title', isPlaying ? 'Pause' : 'Play');
}

function togglePlaylist() {
    playlistContainer.classList.toggle('hidden');
}

function updatePlaylistUI() {
    if (playlist.length === 0) {
        playlistEl.innerHTML = `
            <div class="p-2 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-500 dark:text-gray-400 text-center">
                Your playlist is empty
            </div>
        `;
        return;
    }
    
    playlistEl.innerHTML = playlist.map((track, index) => `
        <div class="flex items-center p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${index === currentTrackIndex ? 'border-l-4 border-indigo-500' : ''}" 
             data-index="${index}">
            <div class="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center mr-3">
                <i class="fas ${index === currentTrackIndex && isPlaying ? 'fa-pause' : 'fa-play'} text-xs text-gray-500 dark:text-gray-400"></i>
            </div>
            <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-gray-900 dark:text-white truncate">${track.title}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 truncate">${track.artist}</div>
            </div>
            <div class="ml-2 text-xs text-gray-500 dark:text-gray-400">${track.duration}</div>
        </div>
    `).join('');
    
    // Add click handlers to playlist items
    playlistEl.querySelectorAll('[data-index]').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            if (index !== currentTrackIndex) {
                currentTrackIndex = index;
                pauseTime = 0;
                loadTrack(playlist[currentTrackIndex]);
                if (isPlaying) {
                    playAudio();
                }
            } else {
                togglePlayPause();
            }
        });
    });
}

function showAddTrackModal() {
    // In a real app, this would show a modal to add a track
    alert('In a real app, this would open a modal to add a track to your playlist.');
}

// Initialize the app when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export functions that might be needed by other scripts
window.TimeMethods = {
    getCurrentMethod: () => timeMethodSelect.value,
    getMethodSettings: (methodId) => timeMethods[methodId] || null,
    playNextTrack,
    playPreviousTrack,
    togglePlayPause
};
