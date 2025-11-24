// Time Management Methods Configuration
const timeMethods = {
    'pomodoro': {
        name: 'Pomodoro',
        description: 'Work for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer 15-30 minute break.',
        workDuration: 25 * 60, // 25 minutes in seconds
        shortBreak: 5 * 60,    // 5 minutes
        longBreak: 15 * 60,    // 15 minutes
        intervals: 4,          // Number of work intervals before long break
        color: 'indigo',
        icon: 'fa-clock'
    },
    '52-17': {
        name: '52-17',
        description: 'Work for 52 minutes, then take a 17-minute break. Based on productivity research showing optimal work/rest cycles.',
        workDuration: 52 * 60,
        shortBreak: 17 * 60,
        longBreak: 30 * 60,
        intervals: 2,
        color: 'blue',
        icon: 'fa-hourglass-half'
    },
    'flowtime': {
        name: 'Flowtime',
        description: 'Work in flexible time blocks based on your natural flow state. Take breaks when you feel your focus waning.',
        workDuration: 45 * 60,
        shortBreak: 15 * 60,
        longBreak: 30 * 60,
        intervals: 3,
        color: 'purple',
        icon: 'fa-infinity'
    },
    'ultradian': {
        name: 'Ultradian Rhythms',
        description: 'Work in 90-minute cycles followed by 20-30 minute breaks, aligned with your body\'s natural energy cycles.',
        workDuration: 90 * 60,
        shortBreak: 20 * 60,
        longBreak: 30 * 60,
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
let currentTrack = null;
let isPlaying = false;
const tracks = [
    {
        id: 'lofi-study',
        title: 'Lofi Study',
        artist: 'Chill Beats',
        duration: '∞',
        cover: '/static/images/lofi-cover.jpg'
    },
    {
        id: 'jazz-relax',
        title: 'Jazz Relaxation',
        artist: 'Smooth Jazz',
        duration: '∞',
        cover: '/static/images/jazz-cover.jpg'
    },
    {
        id: 'piano-study',
        title: 'Piano Study',
        artist: 'Classical Piano',
        duration: '∞',
        cover: '/static/images/piano-cover.jpg'
    }
];

// Play a track
function playTrack(trackId) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    
    currentTrack = track;
    isPlaying = true;
    
    // Update UI
    updateNowPlaying(track);
    updatePlayPauseButton();
    
    // In a real implementation, you would play the actual audio here
    console.log('Now playing:', track.title);
}

// Toggle play/pause
function togglePlayPause() {
    isPlaying = !isPlaying;
    updatePlayPauseButton();
    
    if (isPlaying) {
        console.log('Resumed playback');
    } else {
        console.log('Paused playback');
    }
}

// Update the now playing display
function updateNowPlaying(track) {
    const nowPlaying = document.getElementById('now-playing');
    if (!nowPlaying) return;
    
    nowPlaying.innerHTML = `
        <div class="flex items-center space-x-3">
            <img src="${track.cover}" alt="${track.title}" class="w-12 h-12 rounded">
            <div>
                <div class="font-medium text-gray-900 dark:text-white">${track.title}</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">${track.artist}</div>
            </div>
        </div>
    `;
}

// Update play/pause button
function updatePlayPauseButton() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (!playPauseBtn) return;
    
    const icon = playPauseBtn.querySelector('i');
    if (isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    }
}

// Initialize the music player
function initMusicPlayer() {
    console.log('Initializing music player...');
    
    // Only initialize if the player elements exist
    const closeBtn = document.getElementById('close-youtube');
    const radioStations = document.querySelectorAll('.radio-station');
    
    // Load YouTube API first
    console.log('Loading YouTube API...');
    loadYouTubeIframeAPI();
    
    // Set up close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeYouTubePlayer);
        console.log('Close button event listener added');
    }
    
    // Set up radio stations
    if (radioStations.length > 0) {
        console.log('Found', radioStations.length, 'radio stations');
        
        radioStations.forEach((station) => {
            station.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const src = station.getAttribute('data-src');
                console.log('Station clicked:', src);
                
                if (src) {
                    // Update active station UI
                    radioStations.forEach(s => s.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20'));
                    station.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20');
                    
                    // Play the station
                    playStation(src);
                }
            });
        });
        
        // Load last played station
        const lastStation = localStorage.getItem('lastPlayedStation');
        if (lastStation) {
            console.log('Loading last played station:', lastStation);
            
            // Small delay to ensure UI is ready
            setTimeout(() => {
                const station = Array.from(radioStations).find(s => 
                    s.getAttribute('data-src') === lastStation
                );
                
                if (station) {
                    console.log('Found last played station in DOM, clicking it');
                    station.click();
                }
            }, 1500);
        } else if (radioStations.length > 0) {
            // Auto-play the first station if none was previously selected
            console.log('No last played station, auto-playing first station');
            setTimeout(() => {
                radioStations[0].click();
            }, 1500);
        }
    } else {
        console.warn('No radio stations found in the DOM');
    }
}

// Music Player Elements
const audioPlayer = document.getElementById('audio-player');
const volumeControl = document.getElementById('volume');
const muteBtn = document.getElementById('mute-btn');
const radioStations = document.querySelectorAll('.radio-station');

// Music player state
let isMuted = false;
let currentStation = null;
const stations = [
    {
        id: 'lofi-girl',
        name: 'Lofi Girl',
        description: 'lofi hip hop radio - beats to relax/study to',
        url: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=0&controls=0&showinfo=0&rel=0&modestbranding=1',
        color: 'indigo'
    },
    {
        id: 'chillhop',
        name: 'Chillhop Radio',
        description: 'jazzy & lofi hip hop beats',
        url: 'https://www.youtube.com/embed/5yx6BWlEVcY?autoplay=1&mute=0&controls=0&showinfo=0&rel=0&modestbranding=1',
        color: 'green'
    },
    {
        id: 'coffee-shop',
        name: 'Coffee Shop Radio',
        description: 'cozy coffee shop ambience',
        url: 'https://www.youtube.com/embed/DWcJFNfaw9c?autoplay=1&mute=0&controls=0&showinfo=0&rel=0&modestbranding=1',
        color: 'yellow'
    }
];
let pauseTime = 0;
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
    
    // Set up event listeners first
    setupEventListeners();
    
    // Load user preferences
    loadUserPreferences();
    
    // Initialize the music player
    setTimeout(() => {
        initMusicPlayer();
    }, 500);
    
    // Initialize the timer if the function exists
    if (typeof window.initTimer === 'function') {
        console.log('Initializing timer...');
        window.initTimer();
    } else {
        console.warn('initTimer function not found on window object');
    }
    
    // If we have a selected method, update the timer with its settings
    const selectedMethod = localStorage.getItem('selectedMethod') || 'pomodoro';
    console.log('Loading selected method:', selectedMethod);
    
    // Update the select element to show the current method
    if (timeMethodSelect) {
        timeMethodSelect.value = selectedMethod;
        // Trigger change event to update the UI
        const event = new Event('change');
        timeMethodSelect.dispatchEvent(event);
    }
    
    // Update timer with the selected method
    updateTimerWithMethod(selectedMethod);
    
    console.log('Application initialized');
    return true;
} // Indicate successful initialization

// Set up event listeners
function setupEventListeners() {
    // Time method selection
    if (timeMethodSelect) {
        timeMethodSelect.addEventListener('change', handleMethodChange);
    }
    
    // Music player controls
    if (volumeControl) {
        volumeControl.addEventListener('input', handleVolumeChange);
    }
    
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }
    
    // Set up radio station click handlers
    radioStations.forEach(station => {
        station.addEventListener('click', () => {
            const stationId = station.getAttribute('data-station');
            playStation(stationId);
        });
    });
    
    // Set initial volume
    if (audioPlayer) {
        audioPlayer.volume = volumeControl ? volumeControl.value : 0.5;
    }
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
    
    // Update the global timer variables
    window.workDuration = method.workDuration;
    window.shortBreakDuration = method.shortBreak;
    window.longBreakDuration = method.longBreak;
    window.totalIntervals = method.intervals;
    
    console.log('Timer settings updated:', {
        workDuration: window.workDuration,
        shortBreak: window.shortBreakDuration,
        longBreak: window.longBreakDuration,
        intervals: window.totalIntervals
    });
    
    // Update the timer display if the timer is initialized
    if (window.timer) {
        console.log('Updating timer instance with new settings');
        const wasRunning = window.timer.isRunning;
        
        // Store current state
        const currentTime = window.timer.timeLeft;
        const currentPhase = window.timer.isBreak ? 'break' : 'work';
        
        // Update timer settings
        window.timer.workTime = method.workDuration;
        window.timer.breakTime = method.shortBreak;
        window.timer.longBreakTime = method.longBreak;
        window.timer.intervals = method.intervals;
        
        // Reset the timer with new settings
        window.timer.resetTimer();
        
        // If timer was running, keep it running with new settings
        if (wasRunning) {
            window.timer.startTimer();
        }
        
        console.log('Timer updated successfully');
    } else if (typeof window.initTimer === 'function') {
        console.log('Initializing timer with new settings');
        window.initTimer();
        
        // Update the timer display with the new method's work duration
        const timerDisplay = document.getElementById('timer');
        if (timerDisplay) {
            const minutes = Math.floor(method.workDuration / 60);
            const seconds = method.workDuration % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    } else {
        console.warn('Timer functions not available yet');
        
        // Fallback: Update the display manually
        const timerDisplay = document.getElementById('timer');
        if (timerDisplay) {
            const minutes = Math.floor(method.workDuration / 60);
            const seconds = method.workDuration % 60;
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
    // Try to load from localStorage
    const savedMethod = localStorage.getItem('preferredTimeMethod') || 'pomodoro';
    const savedMethods = JSON.parse(localStorage.getItem('timeMethods') || '{}');
    
    // Merge saved methods with defaults
    Object.entries(savedMethods).forEach(([key, value]) => {
        if (timeMethods[key]) {
            timeMethods[key] = { ...timeMethods[key], ...value };
        }
    });
    
    // Set the selected method
    timeMethodSelect.value = savedMethod;
    if (savedMethod) {
        timeMethodSelect.dispatchEvent(new Event('change'));
    }
    
    // Load volume preference
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume !== null) {
        volumeControl.value = savedVolume;
        updateVolume();
    }
    
    // Get recommended method (in a real app, this would come from the backend)
    setTimeout(() => {
        recommendMethod();
    }, 1000);
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

// Music Player Functions
function togglePlayPause() {
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
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

function updateVolume() {
    const volume = volumeControl.value / 100;
    if (audioContext) {
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;
        
        if (audioSource) {
            audioSource.disconnect();
            audioSource.connect(gainNode).connect(audioContext.destination);
        }
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
    const icon = playPauseBtn.querySelector('i');
    if (isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    }
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
