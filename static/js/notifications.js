// Notification System - Frontend
// Handles displaying and managing notifications in the UI

(function() {
    let notificationCheckInterval = null;
    let unreadCount = 0;

    // Initialize notification system
    function init() {
        // Check for notifications every 30 seconds
        checkNotifications();
        notificationCheckInterval = setInterval(checkNotifications, 30000);

        // Set up notification panel toggle
        const notifBell = document.getElementById('notification-bell');
        const notifPanel = document.getElementById('notification-panel');
        const notifOverlay = document.getElementById('notification-overlay');

        if (notifBell && notifPanel) {
            notifBell.addEventListener('click', toggleNotificationPanel);
        }

        if (notifOverlay) {
            notifOverlay.addEventListener('click', closeNotificationPanel);
        }

        // Set up mark all read button
        const markAllReadBtn = document.getElementById('mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', markAllNotificationsRead);
        }
    }

    async function checkNotifications() {
        try {
            // Get unread count
            const countResponse = await fetch('/api/notifications/unread-count');
            if (countResponse.ok) {
                const data = await countResponse.json();
                updateNotificationBadge(data.count);
            }
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }

    function updateNotificationBadge(count) {
        unreadCount = count;
        const badge = document.getElementById('notification-badge');
        
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    async function toggleNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        const overlay = document.getElementById('notification-overlay');
        
        if (!panel || !overlay) return;

        const isOpen = !panel.classList.contains('hidden');

        if (isOpen) {
            closeNotificationPanel();
        } else {
            // Load notifications
            await loadNotifications();
            panel.classList.remove('hidden');
            overlay.classList.remove('hidden');
        }
    }

    function closeNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        const overlay = document.getElementById('notification-overlay');
        
        if (panel) panel.classList.add('hidden');
        if (overlay) overlay.classList.add('hidden');
    }

    async function loadNotifications() {
        try {
            const response = await fetch('/api/notifications?limit=20');
            if (!response.ok) return;

            const notifications = await response.json();
            renderNotifications(notifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    function renderNotifications(notifications) {
        const container = document.getElementById('notification-list');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                        <i class="fas fa-bell-slash text-gray-400 text-xl"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">No notifications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(n => createNotificationHTML(n)).join('');

        // Add event listeners to notification items
        container.querySelectorAll('.notification-item').forEach(item => {
            const notifId = parseInt(item.dataset.notificationId);
            const notification = notifications.find(n => n.id === notifId);

            item.addEventListener('click', () => handleNotificationClick(notification));

            const dismissBtn = item.querySelector('.dismiss-notification');
            if (dismissBtn) {
                dismissBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dismissNotification(notifId);
                });
            }
        });
    }

    function createNotificationHTML(notification) {
        const priorityColors = {
            'high': 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10',
            'medium': 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10',
            'low': 'border-gray-200 dark:border-gray-700'
        };

        const typeIcons = {
            'deadline': 'fa-calendar-exclamation text-red-500',
            'study_session': 'fa-book-open text-blue-500',
            'break': 'fa-coffee text-green-500',
            'achievement': 'fa-trophy text-yellow-500',
            'streak': 'fa-fire text-orange-500'
        };

        const priorityClass = priorityColors[notification.priority] || priorityColors['low'];
        const iconClass = typeIcons[notification.notification_type] || 'fa-bell text-indigo-500';
        const unreadClass = notification.is_read ? 'opacity-75' : '';
        
        const timeAgo = formatTimeAgo(new Date(notification.delivered_at));

        return `
            <div class="notification-item ${priorityClass} ${unreadClass} border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors mb-2"
                 data-notification-id="${notification.id}">
                <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 mt-1">
                        <i class="fas ${iconClass} text-lg"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <h4 class="font-semibold text-gray-900 dark:text-white text-sm">
                                ${notification.title}
                                ${!notification.is_read ? '<span class="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2"></span>' : ''}
                            </h4>
                            <button class="dismiss-notification text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                                <i class="fas fa-times text-xs"></i>
                            </button>
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">${notification.message}</p>
                        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                            <span>${timeAgo}</span>
                            ${notification.action_text ? `<span class="text-indigo-600 dark:text-indigo-400 font-medium">${notification.action_text} →</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    async function handleNotificationClick(notification) {
        // Mark as read
        await markNotificationRead(notification.id);

        // Navigate to action URL if available
        if (notification.action_url) {
            window.location.href = notification.action_url;
        }

        closeNotificationPanel();
    }

    async function markNotificationRead(notificationId) {
        try {
            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST'
            });
            await checkNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async function dismissNotification(notificationId) {
        try {
            await fetch(`/api/notifications/${notificationId}/dismiss`, {
                method: 'POST'
            });
            await loadNotifications();
            await checkNotifications();
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    }

    async function markAllNotificationsRead() {
        try {
            await fetch('/api/notifications/mark-all-read', {
                method: 'POST'
            });
            await loadNotifications();
            await checkNotifications();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (notificationCheckInterval) {
            clearInterval(notificationCheckInterval);
        }
    });

})();
