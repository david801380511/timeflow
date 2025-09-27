async function deleteAssignment(assignmentId) {
    if (confirm('Are you sure you want to delete this assignment?')) {
        try {
            const response = await fetch(`/api/assignments/${assignmentId}/delete`, {
                method: 'POST',
            });
            
            if (response.ok) {
                // Reload the page to show updated list
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

function editAssignment(assignmentId) {
    // This will be implemented in the next step
    alert('Edit functionality will be added in the next step. Assignment ID: ' + assignmentId);
}
