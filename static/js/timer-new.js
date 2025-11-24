// Timer functionality that works with time-methods.js
let timer;
let timeLeft = 25 * 60; // Default to 25 minutes
let isRunning = false;
let isBreak = false;
let isLongBreak = false;
let currentInterval = 0;
let totalIntervals = 4; // Will be updated by time-methods.js

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const startPauseBtn = document.getElementById('start-pause');
const resetBtn = document.getElementById('reset');
const timerStatus = document.getElementById('timer-status');
const intervalCount = document.getElementById('interval-count');
const currentPhase = document.getElementById('current-phase');
const progressCircle = document.getElementById('progress-circle');

// Initialize the timer
function initTimer() {
    // Set up event listeners
    startPauseBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    // Initialize the display
    updateTimerDisplay();
    updateIntervalCount();
    
    // Set up the progress ring
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;
    
    console.log('Timer initialized with:', {
        workDuration: window.workDuration / 60,
        shortBreak: window.shortBreakDuration / 60,
        longBreak: window.longBreakDuration / 60,
        intervals: window.totalIntervals
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
        
        // Clear any existing interval
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Calculate end time based on remaining time
        endTime = Date.now() + (remainingTime > 0 ? remainingTime * 1000 : getCurrentDuration() * 1000);
        
        // Start the timer
        timerInterval = setInterval(() => {
            remainingTime = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            timeLeft = remainingTime;
            
            updateTimerDisplay();
            updateProgressRing();
            
            if (remainingTime <= 0) {
                remainingTime = 0;
                timerComplete();
            }
        }, 100);
    }
}

// Pause the timer
function pauseTimer() {
    if (isRunning) {
        clearInterval(timerInterval);
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
    // Stop the timer
    clearInterval(timerInterval);
    isRunning = false;
    
    // Reset all timer states
    endTime = 0;
    remainingTime = 0;
    timeLeft = getCurrentDuration();
    
    // Update the UI
    startPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
    startPauseBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
    startPauseBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    
    // Update the current phase
    const currentPhase = document.getElementById('current-phase');
    if (currentPhase) {
        currentPhase.textContent = 'Ready';
    }
    
    updateTimerDisplay();
    updateProgressRing();
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
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
window.toggleTimer = toggleTimer;
