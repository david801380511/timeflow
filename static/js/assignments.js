// DOM Elements for Edit Modal
let editModal, editForm, editCancelBtn, editDescription, editProgress, editProgressValue, editAssignmentId;

document.addEventListener('DOMContentLoaded', () => {
    editModal = document.getElementById('edit-modal');
    editForm = document.getElementById('edit-form');
    editCancelBtn = document.getElementById('edit-cancel');
    editDescription = document.getElementById('edit-description');
    editProgress = document.getElementById('edit-progress');
    editProgressValue = document.getElementById('edit-progress-value');
    editAssignmentId = document.getElementById('edit-assignment-id');

    if (editCancelBtn) {
        editCancelBtn.addEventListener('click', closeEditModal);
    }
    
    if (editProgress) {
        editProgress.addEventListener('input', (e) => {
            editProgressValue.textContent = e.target.value;
        });
    }
    
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
});

async function deleteAssignment(assignmentId) {
    if (confirm('Are you sure you want to delete this assignment?')) {
        try {
            const response = await fetch(`/api/assignments/${assignmentId}/delete`, {
                method: 'POST',
            });
            
            if (response.ok) {
                window.location.reload();
            } else {
                const result = await response.json();
                alert('Error: ' + (result.detail || 'Failed to delete assignment'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while deleting the assignment');
        }
    }
}

async function editAssignment(assignmentId) {
    try {
        // Fetch assignment details
        const response = await fetch(`/api/assignments/${assignmentId}`);
        if (!response.ok) throw new Error('Failed to fetch assignment details');
        
        const assignment = await response.json();
        
        // Populate modal
        if (editAssignmentId) editAssignmentId.value = assignment.id;
        if (editDescription) editDescription.value = assignment.description || '';
        
        // Calculate progress percentage
        let progress = 0;
        if (assignment.estimated_time > 0) {
            progress = Math.round((assignment.time_spent / assignment.estimated_time) * 100);
            if (progress > 100) progress = 100;
        }
        
        if (editProgress) {
            editProgress.value = progress;
            if (editProgressValue) editProgressValue.textContent = progress;
        }
        
        // Show modal
        if (editModal) editModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load assignment details');
    }
}

function closeEditModal() {
    if (editModal) editModal.classList.add('hidden');
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    const id = editAssignmentId.value;
    const description = editDescription.value;
    const progress = editProgress.value;
    
    try {
        const response = await fetch(`/api/assignments/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description,
                progress_percent: progress
            })
        });
        
        if (response.ok) {
            window.location.reload();
        } else {
            const result = await response.json();
            alert('Error: ' + (result.detail || 'Failed to update assignment'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while updating the assignment');
    }
}

// Expose functions to window for inline onclick handlers if needed
window.editAssignment = editAssignment;
window.deleteAssignment = deleteAssignment;
