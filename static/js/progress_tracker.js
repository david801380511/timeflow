// Progress Tracker for TimeFlow
// Tracks calendar blocks and prompts for progress updates when blocks end

(function() {
  let progressModal = null;
  let currentAssignmentId = null;
  let currentEstimatedTime = null;
  let currentTimeSpent = null;
  let blockDuration = null;
  let checkInterval = null;

  // Initialize when DOM is loaded
  function init() {
    progressModal = document.getElementById('progress-modal');
    if (!progressModal) {
      console.log('Progress modal not found - progress tracking disabled');
      return;
    }

    // Set up modal controls
    document.getElementById('progress-cancel')?.addEventListener('click', closeModal);
    document.getElementById('progress-save')?.addEventListener('click', saveProgress);

    // Set up slider
    const slider = document.getElementById('progress-slider');
    if (slider) {
      slider.addEventListener('input', updateSliderDisplay);
    }

    // Check for ending blocks every 60 seconds (reduced frequency)
    checkInterval = setInterval(checkForEndingBlocks, 60000);

    // Also check on page load after a delay
    setTimeout(checkForEndingBlocks, 3000);
  }

  async function checkForEndingBlocks() {
    try {
      // Get all calendar blocks
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const start = formatDateTime(startOfDay);
      const end = formatDateTime(endOfDay);

      const response = await fetch(`/api/calendar/blocks?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      if (!response.ok) return;

      const blocks = await response.json();

      // Find blocks that just ended (within last 2 minutes) and haven't been processed
      const recentlyEndedBlocks = blocks.filter(block => {
        if (block.block_type !== 'study' || !block.assignment_id) return false;

        const blockEnd = new Date(block.end);
        const timeSinceEnd = now - blockEnd;

        // Block ended within last 2 minutes
        return timeSinceEnd > 0 && timeSinceEnd < 120000;
      });

      // Check if we've already shown popup for these blocks
      for (const block of recentlyEndedBlocks) {
        const blockKey = `progress_${block.id}`;
        if (!localStorage.getItem(blockKey)) {
          // Mark as processed
          localStorage.setItem(blockKey, 'true');

          // Show progress popup
          await showProgressPopup(block);
          break; // Show one at a time
        }
      }

      // Clean up old localStorage entries (older than 24 hours)
      cleanupOldProgressMarkers();

    } catch (error) {
      console.error('Error checking for ending blocks:', error);
    }
  }

  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  }

  async function showProgressPopup(block) {
    try {
      // Get assignment details
      const response = await fetch('/api/assignments');
      if (!response.ok) return;

      const assignments = await response.json();
      const assignment = assignments.find(a => a.id === block.assignment_id);

      if (!assignment) return;

      // Calculate block duration in minutes
      const blockStart = new Date(block.start);
      const blockEnd = new Date(block.end);
      blockDuration = Math.round((blockEnd - blockStart) / 60000);

      // Store current assignment data
      currentAssignmentId = assignment.id;
      currentEstimatedTime = assignment.estimated_time;
      currentTimeSpent = assignment.time_spent || 0;

      // Calculate default progress (current time spent + block duration)
      const defaultProgress = currentTimeSpent + blockDuration;

      // Update modal content
      document.getElementById('progress-assignment-name').textContent = assignment.name;
      document.getElementById('progress-session-duration').textContent =
        `Session Duration: ${blockDuration} minutes`;

      // Set up slider
      const slider = document.getElementById('progress-slider');
      const maxProgress = Math.max(currentEstimatedTime, defaultProgress + 60); // Allow up to 60 min over estimate

      slider.max = maxProgress;
      slider.value = defaultProgress;

      document.getElementById('progress-max').textContent = `${maxProgress} min`;

      updateSliderDisplay();

      // Show modal
      progressModal.classList.remove('hidden');

    } catch (error) {
      console.error('Error showing progress popup:', error);
    }
  }

  function updateSliderDisplay() {
    const slider = document.getElementById('progress-slider');
    const value = parseInt(slider.value);

    document.getElementById('progress-value').textContent = value;

    const percent = currentEstimatedTime > 0
      ? Math.min(100, Math.round((value / currentEstimatedTime) * 100))
      : 0;

    document.getElementById('progress-percent').textContent = percent;
  }

  function closeModal() {
    if (progressModal) {
      progressModal.classList.add('hidden');
    }
    currentAssignmentId = null;
    currentEstimatedTime = null;
    currentTimeSpent = null;
    blockDuration = null;
  }

  async function saveProgress() {
    if (!currentAssignmentId) return;

    try {
      const slider = document.getElementById('progress-slider');
      const progressMinutes = parseInt(slider.value);

      // Update progress via API
      const formData = new FormData();
      formData.append('progress_minutes', progressMinutes);

      const response = await fetch(`/api/assignments/${currentAssignmentId}/progress`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        closeModal();

        // Reload page to show updated progress
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to update progress');
      }

    } catch (error) {
      console.error('Error saving progress:', error);
      alert('Failed to update progress');
    }
  }

  function cleanupOldProgressMarkers() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('progress_')) {
        // You could store timestamp with the key if you want more precise cleanup
        // For now, just keep markers for 24 hours
      }
    }
  }

  // Expose function globally for manual testing
  window.showManualProgressPopup = function(assignmentId, blockDurationMinutes) {
    showProgressPopup({
      assignment_id: assignmentId,
      start: new Date(Date.now() - blockDurationMinutes * 60000).toISOString(),
      end: new Date().toISOString(),
      block_type: 'study'
    });
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Clean up interval on page unload
  window.addEventListener('beforeunload', () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });

})();
