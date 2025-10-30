// Sprint and Task Management JavaScript

let sprints = [];
let currentEditingSprint = null;
let currentEditingTask = null;
let currentSprintForTask = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSprints();
    setupEventListeners();
});

function setupEventListeners() {
    // Sprint modal
    document.getElementById('addSprintBtn').addEventListener('click', () => openSprintModal());
    document.getElementById('cancelSprintBtn').addEventListener('click', closeSprintModal);
    document.getElementById('sprintForm').addEventListener('submit', handleSprintSubmit);

    // Task modal
    document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);
    document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);

    // Close modals when clicking outside
    document.getElementById('sprintModal').addEventListener('click', (e) => {
        if (e.target.id === 'sprintModal') closeSprintModal();
    });
    document.getElementById('taskModal').addEventListener('click', (e) => {
        if (e.target.id === 'taskModal') closeTaskModal();
    });
}

async function loadSprints() {
    try {
        const response = await fetch('/api/sprints');
        sprints = await response.json();
        renderSprints();
    } catch (error) {
        console.error('Error loading sprints:', error);
        alert('Failed to load sprints');
    }
}

function renderSprints() {
    const container = document.getElementById('sprintsContainer');
    if (sprints.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No sprints yet. Create your first sprint!</p>';
        return;
    }

    container.innerHTML = sprints.map(sprint => `
        <div class="bg-white shadow-lg rounded-lg p-6 border-l-4 ${getSprintColor(sprint.status)}">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h2 class="text-2xl font-bold mb-2">${escapeHtml(sprint.name)}</h2>
                    <p class="text-gray-600 mb-2">${escapeHtml(sprint.description || '')}</p>
                    <div class="flex gap-4 text-sm text-gray-500">
                        <span class="px-3 py-1 rounded-full ${getStatusBadge(sprint.status)}">${sprint.status}</span>
                        ${sprint.start_date ? `<span>Start: ${formatDate(sprint.start_date)}</span>` : ''}
                        ${sprint.end_date ? `<span>End: ${formatDate(sprint.end_date)}</span>` : ''}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editSprint(${sprint.id})" class="text-blue-500 hover:text-blue-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="deleteSprint(${sprint.id})" class="text-red-500 hover:text-red-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Tasks Section -->
            <div class="mt-6">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-semibold">Tasks (${sprint.tasks.length})</h3>
                    <button onclick="openTaskModal(${sprint.id})" class="bg-green-500 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded">
                        + Add Task
                    </button>
                </div>
                <div class="space-y-2">
                    ${sprint.tasks.length === 0 ?
                        '<p class="text-gray-400 text-sm italic">No tasks yet</p>' :
                        sprint.tasks.map(task => renderTask(task)).join('')
                    }
                </div>
            </div>
        </div>
    `).join('');
}

function renderTask(task) {
    const priorityColor = task.priority === 1 ? 'text-red-600' : task.priority === 2 ? 'text-yellow-600' : 'text-green-600';
    const priorityText = task.priority === 1 ? 'High' : task.priority === 2 ? 'Medium' : 'Low';

    return `
        <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-1 text-xs rounded ${getTaskStatusBadge(task.status)}">${task.status.replace('_', ' ')}</span>
                        <span class="px-2 py-1 text-xs rounded ${priorityColor} bg-opacity-10">${priorityText}</span>
                    </div>
                    <h4 class="font-semibold">${escapeHtml(task.name)}</h4>
                    ${task.description ? `<p class="text-sm text-gray-600 mt-1">${escapeHtml(task.description)}</p>` : ''}
                    <div class="flex gap-4 mt-2 text-xs text-gray-500">
                        ${task.assignee ? `<span>Assignee: ${escapeHtml(task.assignee)}</span>` : ''}
                        ${task.estimated_manpower ? `<span>Est: ${task.estimated_manpower}h</span>` : ''}
                        ${task.due_date ? `<span>Due: ${formatDate(task.due_date)}</span>` : ''}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editTask(${task.id}, ${task.sprint_id})" class="text-blue-500 hover:text-blue-700">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="deleteTask(${task.id})" class="text-red-500 hover:text-red-700">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Sprint Modal Functions
function openSprintModal(sprint = null) {
    currentEditingSprint = sprint;
    const modal = document.getElementById('sprintModal');
    const title = document.getElementById('sprintModalTitle');

    if (sprint) {
        title.textContent = 'Edit Sprint';
        document.getElementById('sprintId').value = sprint.id;
        document.getElementById('sprintName').value = sprint.name;
        document.getElementById('sprintDescription').value = sprint.description || '';
        document.getElementById('sprintStartDate').value = sprint.start_date ? formatDateTimeLocal(sprint.start_date) : '';
        document.getElementById('sprintEndDate').value = sprint.end_date ? formatDateTimeLocal(sprint.end_date) : '';
        document.getElementById('sprintStatus').value = sprint.status;
    } else {
        title.textContent = 'Create New Sprint';
        document.getElementById('sprintForm').reset();
        document.getElementById('sprintId').value = '';
    }

    modal.classList.remove('hidden');
}

function closeSprintModal() {
    document.getElementById('sprintModal').classList.add('hidden');
    currentEditingSprint = null;
}

async function handleSprintSubmit(e) {
    e.preventDefault();

    const sprintId = document.getElementById('sprintId').value;
    const payload = {
        name: document.getElementById('sprintName').value,
        description: document.getElementById('sprintDescription').value,
        start_date: document.getElementById('sprintStartDate').value || null,
        end_date: document.getElementById('sprintEndDate').value || null,
        status: document.getElementById('sprintStatus').value
    };

    try {
        const url = sprintId ? `/api/sprints/${sprintId}` : '/api/sprints';
        const method = sprintId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeSprintModal();
            loadSprints();
        } else {
            const error = await response.json();
            alert(`Error: ${error.detail || 'Failed to save sprint'}`);
        }
    } catch (error) {
        console.error('Error saving sprint:', error);
        alert('Failed to save sprint');
    }
}

async function editSprint(sprintId) {
    const sprint = sprints.find(s => s.id === sprintId);
    if (sprint) {
        openSprintModal(sprint);
    }
}

async function deleteSprint(sprintId) {
    if (!confirm('Are you sure you want to delete this sprint and all its tasks?')) return;

    try {
        const response = await fetch(`/api/sprints/${sprintId}`, { method: 'DELETE' });
        if (response.ok) {
            loadSprints();
        } else {
            alert('Failed to delete sprint');
        }
    } catch (error) {
        console.error('Error deleting sprint:', error);
        alert('Failed to delete sprint');
    }
}

// Task Modal Functions
function openTaskModal(sprintId, task = null) {
    currentSprintForTask = sprintId;
    currentEditingTask = task;
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskModalTitle');

    if (task) {
        title.textContent = 'Edit Task';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskSprintId').value = task.sprint_id;
        document.getElementById('taskName').value = task.name;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.due_date ? formatDateTimeLocal(task.due_date) : '';
        document.getElementById('taskManpower').value = task.estimated_manpower || '';
        document.getElementById('taskAssignee').value = task.assignee || '';
    } else {
        title.textContent = 'Create New Task';
        document.getElementById('taskForm').reset();
        document.getElementById('taskId').value = '';
        document.getElementById('taskSprintId').value = sprintId;
    }

    modal.classList.remove('hidden');
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.add('hidden');
    currentEditingTask = null;
    currentSprintForTask = null;
}

async function handleTaskSubmit(e) {
    e.preventDefault();

    const taskId = document.getElementById('taskId').value;
    const payload = {
        name: document.getElementById('taskName').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        priority: parseInt(document.getElementById('taskPriority').value),
        due_date: document.getElementById('taskDueDate').value || null,
        estimated_manpower: parseInt(document.getElementById('taskManpower').value) || null,
        assignee: document.getElementById('taskAssignee').value || null,
        sprint_id: parseInt(document.getElementById('taskSprintId').value)
    };

    try {
        const url = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
        const method = taskId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeTaskModal();
            loadSprints();
        } else {
            const error = await response.json();
            alert(`Error: ${error.detail || 'Failed to save task'}`);
        }
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Failed to save task');
    }
}

async function editTask(taskId, sprintId) {
    const sprint = sprints.find(s => s.id === sprintId);
    if (sprint) {
        const task = sprint.tasks.find(t => t.id === taskId);
        if (task) {
            openTaskModal(sprintId, task);
        }
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        if (response.ok) {
            loadSprints();
        } else {
            alert('Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task');
    }
}

// Utility Functions
function getSprintColor(status) {
    const colors = {
        'planned': 'border-gray-400',
        'active': 'border-green-500',
        'completed': 'border-blue-500'
    };
    return colors[status] || 'border-gray-400';
}

function getStatusBadge(status) {
    const badges = {
        'planned': 'bg-gray-200 text-gray-800',
        'active': 'bg-green-200 text-green-800',
        'completed': 'bg-blue-200 text-blue-800'
    };
    return badges[status] || 'bg-gray-200 text-gray-800';
}

function getTaskStatusBadge(status) {
    const badges = {
        'new': 'bg-purple-200 text-purple-800',
        'in_progress': 'bg-yellow-200 text-yellow-800',
        'completed': 'bg-green-200 text-green-800',
        'blocked': 'bg-red-200 text-red-800'
    };
    return badges[status] || 'bg-gray-200 text-gray-800';
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTimeLocal(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
