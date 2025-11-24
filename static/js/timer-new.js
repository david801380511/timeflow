// Timer functionality that works with time-methods.js
let timer;
let timeLeft = 0;
let isRunning = false;
let isBreak = false;
let isLongBreak = false;
let currentInterval = 0;
let totalIntervals = 4;
let workDuration = 25 * 60; // Default to 25 minutes
let shortBreakDuration = 5 * 60; // 5 minutes
let longBreakDuration = 15 * 60; // 15 minutes

// Update timer settings from method
function updateTimerSettings(settings) {
    console.log('Updating timer settings:', settings);
    
    if (settings) {
        // Update durations (they should already be in seconds)
        const newWorkDuration = settings.workDuration || workDuration;
        const newShortBreak = settings.shortBreak || shortBreakDuration;
        const newLongBreak = settings.longBreak || longBreakDuration;
        
        // Only update if values have changed
        if (workDuration !== newWorkDuration || 
            shortBreakDuration !== newShortBreak || 
            longBreakDuration !== newLongBreak) {
                
            workDuration = newWorkDuration;
            shortBreakDuration = newShortBreak;
            longBreakDuration = newLongBreak;
            totalIntervals = settings.intervals || totalIntervals;
            
            console.log('Timer durations updated:', {
                workDuration,
                shortBreakDuration,
                longBreakDuration,
                totalIntervals
            });
            
            // If timer is not running, update the display
            if (!isRunning) {
                timeLeft = isBreak ? (isLongBreak ? longBreakDuration : shortBreakDuration) : workDuration;
                updateTimerDisplay();
                updateProgressRing();
                
                // Update the timer status
                if (timerStatus) {
                    timerStatus.textContent = isBreak ? (isLongBreak ? 'Long Break' : 'Short Break') : 'Ready';
                }
                
                // Update the current phase
                if (currentPhase) {
                    currentPhase.textContent = isBreak ? (isLongBreak ? 'Long Break' : 'Short Break') : 'Ready';
                }
            }
        }
    }
}

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const startPauseBtn = document.getElementById('start-pause');
const resetBtn = document.getElementById('reset');
const timerStatus = document.getElementById('timer-status');
const intervalCount = document.getElementById('interval-count');
const currentPhase = document.getElementById('current-phase');
const progressCircle = document.getElementById('progress-circle');

// Initialize the timer
function initTimer(settings) {
    // Update timer settings if provided
    if (settings) {
        updateTimerSettings(settings);
    } else if (window.currentMethod) {
        // Try to get settings from global currentMethod
        updateTimerSettings({
            workDuration: window.workDuration / 60,
            shortBreak: window.shortBreakDuration / 60,
            longBreak: window.longBreakDuration / 60,
            intervals: window.totalIntervals
        });
    }
    
    // Set up event listeners if not already set
    if (!startPauseBtn.hasListener) {
        startPauseBtn.addEventListener('click', toggleTimer);
        startPauseBtn.hasListener = true;
    }
    
    if (!resetBtn.hasListener) {
        resetBtn.addEventListener('click', resetTimer);
        resetBtn.hasListener = true;
    }
    
    // Initialize the display
    timeLeft = workDuration; // Start with work duration
    updateTimerDisplay();
    updateIntervalCount();
    
    // Set up the progress ring
    if (progressCircle) {
        const radius = progressCircle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference;
    }
    
    console.log('Timer initialized with:', {
        workDuration: workDuration / 60,
        shortBreak: shortBreakDuration / 60,
        longBreak: longBreakDuration / 60,
        intervals: totalIntervals
    });
}

// Toggle timer between running and paused states
function toggleTimer() {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

// Track timer state
let timerInterval;
let endTime = 0;
let remainingTime = 0;

// Start the timer
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        startPauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
        startPauseBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        startPauseBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
        
        // Update the current phase
        const currentPhase = document.getElementById('current-phase');
        if (currentPhase) {
            currentPhase.textContent = 'Running';
        }
        
        const currentDuration = isBreak ? (isLongBreak ? longBreakDuration : shortBreakDuration) : workDuration;
        const startTime = Date.now() - ((currentDuration - timeLeft) * 1000);
        
        function update() {
            const currentTime = Date.now();
            const elapsed = Math.floor((currentTime - startTime) / 1000);
            timeLeft = Math.max(0, currentDuration - elapsed);
            
            updateTimerDisplay();
            updateProgressRing();
            
            if (timeLeft <= 0) {
                timerComplete();
            } else {
                timer = requestAnimationFrame(update);
            }
        }
        
        timer = requestAnimationFrame(update);
    }
}

// Pause the timer
function pauseTimer() {
    if (isRunning) {
        cancelAnimationFrame(timer);
        isRunning = false;
        startPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Resume</span>';
        startPauseBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        startPauseBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
        
        // Update the current phase to show paused state
        const currentPhase = document.getElementById('current-phase');
        if (currentPhase) {
            currentPhase.textContent = 'Paused';
        }
    }
}

// Reset the timer
function resetTimer() {
    // Stop any running animation
    if (timer) {
        cancelAnimationFrame(timer);
    }
    
    // Clear any intervals
    if (window.timerInterval) {
        clearInterval(window.timerInterval);
        delete window.timerInterval;
    }
    
    // Reset timer state
    isRunning = false;
    
    // Reset to work duration if not in break
    if (!isBreak) {
        timeLeft = workDuration;
    } else {
        timeLeft = isLongBreak ? longBreakDuration : shortBreakDuration;
    }
    
    // Update the UI
    startPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
    startPauseBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
    startPauseBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    
    // Update the display
    updateTimerDisplay();
    updateProgressRing();
    
    // Update the timer status
    if (timerStatus) {
        timerStatus.textContent = isBreak ? (isLongBreak ? 'Long Break' : 'Short Break') : 'Ready';
        timerStatus.className = `px-3 py-1 ${
            isBreak 
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
        } rounded-full text-sm font-medium`;
    }
    
    // Update the current phase
    if (currentPhase) {
        currentPhase.textContent = isBreak ? (isLongBreak ? 'Long Break' : 'Short Break') : 'Ready';
    }
}

// Handle timer completion
document.addEventListener('timerComplete', () => {
    pauseTimer();
    
    if (!isBreak) {
        // Work session completed
        currentInterval++;
        updateIntervalCount();
        
        // Check if it's time for a long break
        const isLongBreakTime = currentInterval % totalIntervals === 0;
        
        // Show break modal
        showBreakModal(isLongBreakTime);
    } else {
        // Break completed, start work session
        isBreak = false;
        isLongBreak = false;
        timerStatus.textContent = 'Focus Time';
        timerStatus.className = 'px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium';
        currentPhase.textContent = 'Focus';
    }
    
    // Reset timer for the next session
    timeLeft = getCurrentDuration();
    updateTimerDisplay();
    updateProgressRing();
});

// Update the timer display
function updateTimerDisplay() {
    // Ensure timeLeft is a number and not negative
    const currentTime = Math.max(0, Math.floor(timeLeft));
    // Always show minutes and seconds, even for durations over an hour
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    
    // Format time as MM:SS
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeDisplay) {
        timeDisplay.textContent = timeString;
    } else {
        console.error('Time display element not found');
    }
}

// Update the progress ring
function updateProgressRing() {
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const totalDuration = getCurrentDuration();
    const offset = circumference - (timeLeft / totalDuration) * circumference;
    progressCircle.style.strokeDashoffset = offset;
}

// Update the interval counter
function updateIntervalCount() {
    intervalCount.textContent = `Round ${currentInterval + 1}/${totalIntervals}`;
}

// Show break modal
function showBreakModal(isLongBreak) {
    const breakModal = document.getElementById('break-modal');
    const breakTitle = document.getElementById('break-title');
    const breakDescription = document.getElementById('break-description');
    const breakDuration = document.getElementById('break-duration');
    
    if (isLongBreak) {
        breakTitle.textContent = 'Time for a Long Break!';
        breakDescription.textContent = 'You\'ve completed all your focus sessions. Take a well-deserved break!';
        breakDuration.textContent = `${window.longBreakDuration / 60} minutes`;
    } else {
        breakTitle.textContent = 'Time for a Break!';
        breakDescription.textContent = 'You\'ve completed a focus session. Take a short break to recharge.';
        breakDuration.textContent = `${window.shortBreakDuration / 60} minutes`;
    }
    
    breakModal.classList.remove('hidden');
    
    // Set up event listeners for the modal buttons
    const startBreakBtn = document.getElementById('start-break');
    const skipBreakBtn = document.getElementById('skip-break');
    
    const startBreakHandler = () => {
        isBreak = true;
        isLongBreak = isLongBreak;
        timerStatus.textContent = isLongBreak ? 'Long Break' : 'Short Break';
        timerStatus.className = `px-3 py-1 ${isLongBreak ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'} rounded-full text-sm font-medium`;
        currentPhase.textContent = isLongBreak ? 'Long Break' : 'Short Break';
        breakModal.classList.add('hidden');
        
        // Start the break timer
        timeLeft = isLongBreak ? window.longBreakDuration : window.shortBreakDuration;
        startTimer();
        
        // Clean up event listeners
        startBreakBtn.removeEventListener('click', startBreakHandler);
        skipBreakBtn.removeEventListener('click', skipBreakHandler);
    };
    
    const skipBreakHandler = () => {
        breakModal.classList.add('hidden');
        
        // Clean up event listeners
        startBreakBtn.removeEventListener('click', startBreakHandler);
        skipBreakBtn.removeEventListener('click', skipBreakHandler);
    };
    
    startBreakBtn.addEventListener('click', startBreakHandler);
    skipBreakBtn.addEventListener('click', skipBreakHandler);
}

// Get the current duration based on the current state
function getCurrentDuration() {
    if (isBreak) {
        return isLongBreak ? window.longBreakDuration : window.shortBreakDuration;
    } else {
        return window.workDuration;
    }
}

// Timer complete handler
function timerComplete() {
    const event = new Event('timerComplete');
    document.dispatchEvent(event);
}

// Make functions available globally
window.initTimer = initTimer;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.updateTimerSettings = updateTimerSettings;
window.updateTimerDisplay = updateTimerDisplay;
