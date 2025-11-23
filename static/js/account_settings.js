// Account Settings JavaScript

document.addEventListener('DOMContentLoaded', async () => {
    // Load account information
    await loadAccountInfo();
    
    // Setup event listeners
    setupEventListeners();
});

async function loadAccountInfo() {
    try {
        const response = await fetch('/api/account');
        if (response.ok) {
            const data = await response.json();
            
            // Update UI with account data
            document.getElementById('username-value').value = data.username;
            document.getElementById('email-value').value = data.email;
            
            // Format and display creation date
            const createdDate = new Date(data.created_at);
            document.getElementById('created-date').textContent = createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    } catch (error) {
        console.error('Error loading account info:', error);
        showMessage('Failed to load account information', 'error');
    }
}

function setupEventListeners() {
    // Username edit
    document.getElementById('edit-username-btn').addEventListener('click', () => {
        document.getElementById('username-display').classList.add('hidden');
        document.getElementById('username-edit').classList.remove('hidden');
        document.getElementById('new-username').value = document.getElementById('username-value').value;
        document.getElementById('new-username').focus();
    });
    
    document.getElementById('cancel-username').addEventListener('click', () => {
        document.getElementById('username-edit').classList.add('hidden');
        document.getElementById('username-display').classList.remove('hidden');
    });
    
    document.getElementById('save-username').addEventListener('click', updateUsername);
    
    // Email edit
    document.getElementById('edit-email-btn').addEventListener('click', () => {
        document.getElementById('email-display').classList.add('hidden');
        document.getElementById('email-edit').classList.remove('hidden');
        document.getElementById('new-email').value = document.getElementById('email-value').value;
        document.getElementById('new-email').focus();
    });
    
    document.getElementById('cancel-email').addEventListener('click', () => {
        document.getElementById('email-edit').classList.add('hidden');
        document.getElementById('email-display').classList.remove('hidden');
    });
    
    document.getElementById('save-email').addEventListener('click', updateEmail);
    
    // Password change
    document.getElementById('change-password-btn').addEventListener('click', () => {
        document.getElementById('password-display').classList.add('hidden');
        document.getElementById('password-edit').classList.remove('hidden');
        document.getElementById('current-password').focus();
    });
    
    document.getElementById('cancel-password').addEventListener('click', () => {
        document.getElementById('password-edit').classList.add('hidden');
        document.getElementById('password-display').classList.remove('hidden');
        // Clear password fields
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    });
    
    document.getElementById('save-password').addEventListener('click', updatePassword);
    
    // Account deletion
    document.getElementById('delete-account-btn').addEventListener('click', () => {
        document.getElementById('delete-modal').classList.remove('hidden');
    });
    
    document.getElementById('cancel-delete').addEventListener('click', () => {
        document.getElementById('delete-modal').classList.add('hidden');
        document.getElementById('delete-password').value = '';
    });
    
    document.getElementById('delete-form').addEventListener('submit', deleteAccount);
}

async function updateUsername() {
    const newUsername = document.getElementById('new-username').value.trim();
    
    if (!newUsername) {
        showMessage('Username cannot be empty', 'error');
        return;
    }
    
    if (newUsername.length < 3) {
        showMessage('Username must be at least 3 characters', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('new_username', newUsername);
        
        const response = await fetch('/api/account/username', {
            method: 'PATCH',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('username-value').value = data.username;
            document.getElementById('username-edit').classList.add('hidden');
            document.getElementById('username-display').classList.remove('hidden');
            showMessage('Username updated successfully', 'success');
        } else {
            showMessage(data.error || 'Failed to update username', 'error');
        }
    } catch (error) {
        console.error('Error updating username:', error);
        showMessage('An error occurred while updating username', 'error');
    }
}

async function updateEmail() {
    const newEmail = document.getElementById('new-email').value.trim();
    
    if (!newEmail) {
        showMessage('Email cannot be empty', 'error');
        return;
    }
    
    if (!newEmail.includes('@') || !newEmail.includes('.')) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('new_email', newEmail);
        
        const response = await fetch('/api/account/email', {
            method: 'PATCH',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('email-value').value = data.email;
            document.getElementById('email-edit').classList.add('hidden');
            document.getElementById('email-display').classList.remove('hidden');
            showMessage('Email updated successfully', 'success');
        } else {
            showMessage(data.error || 'Failed to update email', 'error');
        }
    } catch (error) {
        console.error('Error updating email:', error);
        showMessage('An error occurred while updating email', 'error');
    }
}

async function updatePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validation
    if (!currentPassword) {
        showMessage('Please enter your current password', 'error');
        return;
    }
    
    if (!newPassword) {
        showMessage('Please enter a new password', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('New password must be at least 6 characters', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('current_password', currentPassword);
        formData.append('new_password', newPassword);
        
        const response = await fetch('/api/account/password', {
            method: 'PATCH',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('password-edit').classList.add('hidden');
            document.getElementById('password-display').classList.remove('hidden');
            
            // Clear password fields
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            
            showMessage('Password updated successfully', 'success');
        } else {
            showMessage(data.error || 'Failed to update password', 'error');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showMessage('An error occurred while updating password', 'error');
    }
}

async function deleteAccount(e) {
    e.preventDefault();
    
    const password = document.getElementById('delete-password').value;
    
    if (!password) {
        showMessage('Please enter your password to confirm deletion', 'error');
        return;
    }
    
    if (!confirm('Are you absolutely sure? This action cannot be undone and all your data will be permanently deleted.')) {
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('password', password);
        
        const response = await fetch('/api/account', {
            method: 'DELETE',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success message and redirect to home after a delay
            showMessage('Account deleted successfully. Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showMessage(data.error || 'Failed to delete account', 'error');
            document.getElementById('delete-password').value = '';
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        showMessage('An error occurred while deleting account', 'error');
    }
}

function showMessage(message, type) {
    const container = document.getElementById('message-container');
    
    const alertClass = type === 'success' 
        ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-600 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-300';
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    container.innerHTML = `
        <div class="flex items-center gap-3 p-4 rounded-lg border ${alertClass}">
            <i class="fas ${icon}"></i>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    // Scroll to message
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}
