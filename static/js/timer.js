// DOM Elements
const timeDisplay = document.getElementById('time-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const timerStatus = document.getElementById('timer-status');
const intervalCount = document.getElementById('interval-count');
const breakSuggestion = document.getElementById('break-suggestion');
const breakActivity = document.getElementById('break-activity');
const breakDuration = document.getElementById('break-duration');
const startBreakBtn = document.getElementById('start-break');
const skipBreakBtn = document.getElementById('skip-break');
const breakModal = document.getElementById('break-modal');
const breakTimer = document.getElementById('break-timer');
const breakActivityName = document.getElementById('break-activity-name');
const endBreakEarlyBtn = document.getElementById('end-break-early');
const progressRing = document.getElementById('progress-ring');
const assignmentSelect = document.getElementById('assignment-select');
const assignmentDetails = document.getElementById('assignment-details');
const assignmentName = document.getElementById('assignment-name');
const assignmentDue = document.getElementById('assignment-due');
const assignmentProgress = document.getElementById('assignment-progress');
const progressBar = document.getElementById('progress-bar');
const todayFocus = document.getElementById('today-focus');
const completedIntervals = document.getElementById('completed-intervals');
const nextLongBreak = document.getElementById('next-long-break');

// Timer variables
let timer;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isRunning = false;
let isBreak = false;
let isLongBreak = false;
let currentInterval = 0;
let totalIntervals = 0;
let settings = null;
let breakActivities = [];
let currentBreakActivity = null;
let currentAssignmentId = null;

// Initialize the app
async function init() {
    await loadSettings();
    await loadBreakActivities();
    updateTimerDisplay();
    setupEventListeners();
    updateIntervalCount();
    updateNextLongBreak();
    loadTodayFocus();
}

// Load user settings
async function loadSettings() {
    try {
        const response = await fetch('/api/settings/');
        settings = await response.json();
    } catch (error) {
        console.error('Error loading settings:', error);
        // Default settings if API fails
        settings = {
            work_interval: 25,
            short_break: 5,
            long_break: 15,
            short_breaks_before_long: 3,
            auto_start_breaks: true,
            auto_start_pomodoros: true,
            long_break_delay: 15
        };
    }
    
    // Set initial timer to work interval
    timeLeft = settings.work_interval * 60;
    updateTimerDisplay();
}

// Load break activities
async function loadBreakActivities() {
    try {
        const response = await fetch('/api/break-activities/');
        breakActivities = await response.json();
    } catch (error) {
        console.error('Error loading break activities:', error);
        // Default break activities
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
    }
}

// Setup event listeners
function setupEventListeners() {
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    startBreakBtn.addEventListener('click', startBreak);
    skipBreakBtn.addEventListener('click', skipBreak);
    endBreakEarlyBtn.addEventListener('click', endBreakEarly);
    assignmentSelect.addEventListener('change', handleAssignmentSelect);
}

// Timer functions
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        // Start a new study session if not in break
        if (!isBreak) {
            startStudySession();
        }
        
        timer = setInterval(updateTimer, 1000);
    }
}

function pauseTimer() {
    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    // Reset to work interval if not in break
    if (!isBreak) {
        timeLeft = settings.work_interval * 60;
        updateTimerDisplay();
    }
    
    // Hide break suggestion if showing
    breakSuggestion.classList.add('hidden');
}

function updateTimer() {
    if (timeLeft > 0) {
        timeLeft--;
        updateTimerDisplay();
        updateProgressRing();
    } else {
        clearInterval(timer);
        isRunning = false;
        
        if (isBreak) {
            // Break ended
            endBreak();
        } else {
            // Work session ended
            endWorkSession();
        }
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateProgressRing() {
    const totalTime = isBreak ? 
        (isLongBreak ? settings.long_break : settings.short_break) * 60 : 
        settings.work_interval * 60;
    const progress = ((totalTime - timeLeft) / totalTime) * 502.65; // 2 * π * r (80) ≈ 502.65
    progressRing.style.strokeDashoffset = 502.65 - progress;
}

// Study session functions
async function startStudySession() {
    if (!currentAssignmentId) return;
    
    try {
        const response = await fetch('/api/study-sessions/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_type: 'work',
                assignment_id: currentAssignmentId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to start study session');
        }
        
        const session = await response.json();
        console.log('Study session started:', session);
    } catch (error) {
        console.error('Error starting study session:', error);
    }
}

function endWorkSession() {
    // Increment completed intervals
    currentInterval++;
    totalIntervals++;
    updateIntervalCount();
    updateNextLongBreak();
    
    // Show break suggestion
    isBreak = true;
    isLongBreak = currentInterval % settings.short_breaks_before_long === 0;
    
    // Get a random break activity
    const activityType = isLongBreak ? 'long' : 'short';
    const activities = breakActivities.filter(a => a.activity_type === activityType);
    currentBreakActivity = activities[Math.floor(Math.random() * activities.length)];
    
    // Update UI
    timerStatus.textContent = isLongBreak ? 'Long Break' : 'Short Break';
    breakActivity.textContent = `It's time for a break! How about ${currentBreakActivity.name.toLowerCase()}?`;
    breakDuration.textContent = isLongBreak ? settings.long_break : settings.short_break;
    breakSuggestion.classList.remove('hidden');
    
    // Auto-start break if enabled
    if (settings.auto_start_breaks) {
        startBreak();
    }
}

function startBreak() {
    // Hide suggestion and show modal
    breakSuggestion.classList.add('hidden');
    breakModal.classList.remove('hidden');
    
    // Set break duration and activity
    const breakTime = isLongBreak ? settings.long_break : settings.short_break;
    timeLeft = breakTime * 60;
    breakActivityName.textContent = currentBreakActivity.name;
    updateTimerDisplay();
    
    // Start the break timer
    startTimer();
}

function endBreak() {
    // Hide modal
    breakModal.classList.add('hidden');
    
    // Reset for work
    isBreak = false;
    isLongBreak = false;
    timeLeft = settings.work_interval * 60;
    timerStatus.textContent = 'Focus Time';
    
    // Auto-start next pomodoro if enabled
    if (settings.auto_start_pomodoros) {
        startTimer();
    } else {
        updateTimerDisplay();
        updateProgressRing();
    }
}

function skipBreak() {
    breakSuggestion.classList.add('hidden');
    endBreak();
}

function endBreakEarly() {
    clearInterval(timer);
    endBreak();
}

// Assignment functions
function handleAssignmentSelect(event) {
    const assignmentId = parseInt(event.target.value);
    currentAssignmentId = assignmentId || null;
    
    if (assignmentId) {
        // In a real app, we would fetch the assignment details from the server
        // For now, we'll just show the selected assignment name
        assignmentName.textContent = assignmentSelect.options[assignmentSelect.selectedIndex].text;
        assignmentDetails.classList.remove('hidden');
        
        // Simulate some assignment data
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3); // Due in 3 days
        
        assignmentDue.textContent = `Due: ${dueDate.toLocaleDateString()}`;
        assignmentProgress.textContent = 'Progress: 25% completed';
        progressBar.style.width = '25%';
    } else {
        assignmentDetails.classList.add('hidden');
    }
}

// UI update functions
function updateIntervalCount() {
    intervalCount.textContent = `(${currentInterval}/${settings.short_breaks_before_long})`;
    completedIntervals.textContent = totalIntervals;
}

function updateNextLongBreak() {
    const intervalsLeft = settings.short_breaks_before_long - (currentInterval % settings.short_breaks_before_long);
    nextLongBreak.textContent = `${intervalsLeft} interval${intervalsLeft !== 1 ? 's' : ''}`;
}

async function loadTodayFocus() {
    // In a real app, we would fetch this from the server
    // For now, we'll simulate some data
    const minutes = 45;
    todayFocus.textContent = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
