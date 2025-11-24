/**
 * Music Player Module
 * Handles all music player functionality
 */

// Music player state
const musicPlayer = {
    currentStation: null,
    isPlaying: false,
    volume: 0.5,
    isMuted: false,
    audioContext: null,
    audioElement: null,
    stations: [
        {
            id: 'lofi-girl',
            title: 'Lofi Girl',
            description: 'lofi hip hop radio - beats to relax/study to',
            url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
            cover: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg'
        },
        {
            id: 'cat-lofi',
            title: 'Cat Lofi',
            description: 'cute cat lofi beats to study/relax',
            url: 'https://www.youtube.com/watch?v=SMfHacO_o38',
            cover: 'https://i.ytimg.com/vi/SMfHacO_o38/hqdefault.jpg'
        },
        {
            id: 'peaceful-knight',
            title: 'Peaceful Knight',
            description: 'soothing solitude music for focus',
            url: 'https://www.youtube.com/watch?v=F02iMCEEQWs',
            cover: 'https://i.ytimg.com/vi/F02iMCEEQWs/hqdefault.jpg'
        }
    ],
    
    // Initialize the music player
    init: function() {
        this.cacheDom();
        this.loadStations();
        this.loadVolume();
        this.bindEvents();
        this.loadYouTubeAPI();
        this.updateUI();
    },
    
    // Load YouTube API
    loadYouTubeAPI: function() {
        // This function ensures the YouTube API is loaded
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // Create a global function for YouTube API
        window.onYouTubeIframeAPIReady = () => {
            console.log('YouTube API ready');
        };
    },
    
    // Cache DOM elements
    cacheDom: function() {
        this.dom = {
            playPauseBtn: document.getElementById('play-pause'),
            prevTrackBtn: document.getElementById('prev-track'),
            nextTrackBtn: document.getElementById('next-track'),
            volumeControl: document.getElementById('volume'),
            muteBtn: document.getElementById('mute-btn'),
            nowPlayingTitle: document.getElementById('now-playing-title'),
            nowPlayingDesc: document.getElementById('now-playing-desc'),
            nowPlayingCover: document.getElementById('now-playing-cover'),
            stationsContainer: document.getElementById('radio-stations'),
            addStationBtn: document.getElementById('add-station'),
            refreshStationsBtn: document.getElementById('refresh-stations')
        };
        
        // Create audio element if it doesn't exist
        if (!this.audioElement) {
            this.audioElement = new Audio();
            this.audioElement.volume = this.volume;
        }
    },
    
    // Load stations from localStorage
    loadStations: function() {
        try {
            const savedStations = localStorage.getItem('timeflow_custom_stations');
            if (savedStations) {
                const customStations = JSON.parse(savedStations);
                // Filter out any duplicates
                customStations.forEach(station => {
                    if (!this.stations.some(s => s.id === station.id)) {
                        this.stations.push(station);
                    }
                });
            }
        } catch (e) {
            console.error('Error loading stations:', e);
        }
    },
    
    // Save custom stations to localStorage
    saveStations: function() {
        try {
            const customStations = this.stations.filter(s => s.isCustom);
            localStorage.setItem('timeflow_custom_stations', JSON.stringify(customStations));
        } catch (e) {
            console.error('Error saving stations:', e);
        }
    },
    
    // Bind event listeners
    bindEvents: function() {
        // Play/Pause
        if (this.dom.playPauseBtn) {
            this.dom.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        
        // Previous/Next track
        if (this.dom.prevTrackBtn) {
            this.dom.prevTrackBtn.addEventListener('click', () => this.playPrevious());
        }
        if (this.dom.nextTrackBtn) {
            this.dom.nextTrackBtn.addEventListener('click', () => this.playNext());
        }
        
        // Volume control
        if (this.dom.volumeControl) {
            this.dom.volumeControl.addEventListener('input', (e) => this.setVolume(e.target.value));
        }
        
        // Mute button
        if (this.dom.muteBtn) {
            this.dom.muteBtn.addEventListener('click', () => this.toggleMute());
        }
        
        // Add station button
        if (this.dom.addStationBtn) {
            this.dom.addStationBtn.addEventListener('click', () => this.showAddStationModal());
        }
        
        // Refresh stations button
        if (this.dom.refreshStationsBtn) {
            this.dom.refreshStationsBtn.addEventListener('click', () => this.refreshStations());
        }
    },
    
    // Play a station by ID
    playStation: function(stationId) {
        const station = this.stations.find(s => s.id === stationId);
        if (!station) return;
        
        this.currentStation = station;
        
        // If this is a YouTube URL, handle it with the YouTube iframe
        if (station.url.includes('youtube.com') || station.url.includes('youtu.be')) {
            this.playYouTubeStation(station);
        } else {
            // Handle regular audio
            this.playAudioStation(station);
        }
        
        this.updateUI();
    },
    
    // Play a YouTube station
    playYouTubeStation: function(station) {
        // Stop any currently playing audio
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
        
        // Extract video ID from URL
        const videoId = this.extractYouTubeId(station.url);
        if (!videoId) return;
        
        // Create a hidden iframe for audio only
        let iframe = document.getElementById('youtube-audio');
        if (iframe) {
            // If iframe exists, just change the source
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&loop=1&playlist=${videoId}&mute=0`;
        } else {
            // Create new iframe
            iframe = document.createElement('iframe');
            iframe.id = 'youtube-audio';
            iframe.style.display = 'none';
            iframe.allow = 'autoplay';
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&loop=1&playlist=${videoId}&mute=0`;
            document.body.appendChild(iframe);
            
            // Wait for the iframe to load
            iframe.onload = () => {
                // Set volume to current volume level
                this.setVolume(this.volume * 100);
            };
        }
        
        this.currentStation = station;
        this.isPlaying = true;
        this.updateUI();
    },
    
    // Play a regular audio station
    playAudioStation: function(station) {
        if (!this.audioElement) {
            this.audioElement = new Audio();
        }
        
        // Hide YouTube player if visible
        const youtubeContainer = document.getElementById('youtube-player-container');
        if (youtubeContainer) {
            youtubeContainer.classList.add('hidden');
            const iframe = youtubeContainer.querySelector('iframe');
            if (iframe) {
                iframe.src = '';
            }
        }
        
        // Set up and play the audio
        this.audioElement.src = station.url;
        this.audioElement.volume = this.isMuted ? 0 : this.volume;
        
        this.audioElement.play()
            .then(() => {
                this.isPlaying = true;
                this.updateUI();
            })
            .catch(error => {
                console.error('Error playing audio:', error);
                // Fallback to YouTube if available
                if (station.fallbackUrl) {
                    station.url = station.fallbackUrl;
                    this.playStation(station.id);
                }
            });
    },
    
    // Toggle play/pause
    togglePlayPause: function() {
        if (!this.currentStation) {
            // If nothing is playing, play the first station
            if (this.stations.length > 0) {
                this.playStation(this.stations[0].id);
            }
            return;
        }
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },
    
    // Play the current station
    play: function() {
        if (this.currentStation) {
            this.playStation(this.currentStation.id);
        } else if (this.stations.length > 0) {
            this.playStation(this.stations[0].id);
        }
    },
    
    // Pause playback
    pause: function() {
        const youtubePlayer = document.getElementById('youtube-iframe');
        
        if (youtubePlayer && !youtubePlayer.classList.contains('hidden')) {
            // Pause YouTube player
            const iframe = youtubePlayer.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
        } else if (this.audioElement) {
            // Pause audio element
            this.audioElement.pause();
        }
        
        this.isPlaying = false;
        this.updateUI();
    },
    
    // Play the next station
    playNext: function() {
        if (!this.currentStation || this.stations.length <= 1) return;
        
        const currentIndex = this.stations.findIndex(s => s.id === this.currentStation.id);
        const nextIndex = (currentIndex + 1) % this.stations.length;
        this.playStation(this.stations[nextIndex].id);
    },
    
    // Play the previous station
    playPrevious: function() {
        if (!this.currentStation || this.stations.length <= 1) return;
        
        const currentIndex = this.stations.findIndex(s => s.id === this.currentStation.id);
        const prevIndex = (currentIndex - 1 + this.stations.length) % this.stations.length;
        this.playStation(this.stations[prevIndex].id);
    },
    
    // Set volume (0-100)
    setVolume: function(volume) {
        // Ensure volume is between 0 and 100
        volume = Math.min(100, Math.max(0, volume));
        this.volume = volume / 100; // Convert to 0-1 range for audio element
        
        // Update audio element volume if it exists
        if (this.audioElement) {
            this.audioElement.volume = this.isMuted ? 0 : this.volume;
        }
        
        // Update YouTube iframe volume if it exists
        const iframe = document.getElementById('youtube-iframe');
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.postMessage({
                    event: 'command',
                    func: 'setVolume',
                    args: [volume] // YouTube expects 0-100
                }, '*');
            } catch (e) {
                console.warn('Could not set YouTube volume:', e);
            }
        }
        
        // Update mute state based on volume
        this.isMuted = volume <= 0;
        
        // Update UI and save the new volume
        this.updateUI();
        this.saveVolume();
        
        console.log('Volume set to:', volume);
    },
    
    // Toggle mute state
    toggleMute: function() {
        this.isMuted = !this.isMuted;
        
        // Update audio element
        if (this.audioElement) {
            this.audioElement.muted = this.isMuted;
        }
        
        // Update YouTube iframe
        const iframe = document.getElementById('youtube-iframe');
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.postMessage({
                    event: 'command',
                    func: this.isMuted ? 'mute' : 'unMute',
                    args: ''
                }, '*');
            } catch (e) {
                console.warn('Could not toggle YouTube mute:', e);
            }
        }
        
        this.updateUI();
        this.saveVolume();
    },
    
    // Toggle mute
    toggleMute: function() {
        this.isMuted = !this.isMuted;
        
        if (this.audioElement) {
            this.audioElement.volume = this.isMuted ? 0 : this.volume;
        }
        
        this.updateUI();
        this.saveVolume();
    },
    
    // Save volume to localStorage
    saveVolume: function() {
        try {
            localStorage.setItem('timeflow_volume', this.volume);
            localStorage.setItem('timeflow_muted', this.isMuted);
        } catch (e) {
            console.error('Error saving volume:', e);
        }
    },
    
    // Load volume from localStorage
    loadVolume: function() {
        try {
            const savedVolume = localStorage.getItem('timeflow_volume');
            const savedMuted = localStorage.getItem('timeflow_muted');
            
            if (savedVolume !== null) {
                this.volume = parseFloat(savedVolume);
            }
            
            if (savedMuted !== null) {
                this.isMuted = savedMuted === 'true';
            }
            
            if (this.dom.volumeControl) {
                this.dom.volumeControl.value = this.volume * 100;
            }
            
            if (this.audioElement) {
                this.audioElement.volume = this.isMuted ? 0 : this.volume;
            }
            
            this.updateUI();
        } catch (e) {
            console.error('Error loading volume:', e);
        }
    },
    
    // Update the UI to reflect current state
    updateUI: function() {
        // Update play/pause button
        if (this.dom.playPauseBtn) {
            const icon = this.isPlaying ? 'fa-pause' : 'fa-play';
            this.dom.playPauseBtn.innerHTML = `<i class="fas ${icon}"></i>`;
            this.dom.playPauseBtn.title = this.isPlaying ? 'Pause' : 'Play';
        }
        
        // Update mute button
        if (this.dom.muteBtn) {
            const icon = this.isMuted || this.volume === 0 ? 'fa-volume-mute' : 
                        this.volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up';
            this.dom.muteBtn.innerHTML = `<i class="fas ${icon}"></i>`;
            this.dom.muteBtn.title = this.isMuted ? 'Unmute' : 'Mute';
        }
        
        // Update now playing info
        if (this.currentStation) {
            if (this.dom.nowPlayingTitle) {
                this.dom.nowPlayingTitle.textContent = this.currentStation.title;
            }
            if (this.dom.nowPlayingDesc) {
                this.dom.nowPlayingDesc.textContent = this.currentStation.description || '';
            }
            if (this.dom.nowPlayingCover) {
                this.dom.nowPlayingCover.src = this.currentStation.cover || '';
                this.dom.nowPlayingCover.alt = this.currentStation.title;
                this.dom.nowPlayingCover.style.display = this.currentStation.cover ? 'block' : 'none';
            }
        } else {
            if (this.dom.nowPlayingTitle) {
                this.dom.nowPlayingTitle.textContent = 'Select a station';
            }
            if (this.dom.nowPlayingDesc) {
                this.dom.nowPlayingDesc.textContent = '';
            }
            if (this.dom.nowPlayingCover) {
                this.dom.nowPlayingCover.src = '';
                this.dom.nowPlayingCover.style.display = 'none';
            }
        }
        
        // Update station list
        this.updateStationList();
    },
    
    // Update the station list UI
    updateStationList: function() {
        if (!this.dom.stationsContainer) return;
        
        this.dom.stationsContainer.innerHTML = this.stations.map(station => `
            <div class="radio-station p-3 rounded-lg ${this.currentStation && this.currentStation.id === station.id ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-50 dark:bg-gray-700'} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" 
                 data-id="${station.id}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                            <img src="${station.cover || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6bS01LjUtNC4yNWwtMS45LTEuNDVjLS4yNS0uMzEtLjE5LS43NS4xMi0xLjAxLjMxLS4yNS43NS0uMTkgMS4wMS4xMmwxLjI0IDEuNTYgMy4wNC0zLjc1Yy4yLS4yNS41OC0uMzEuODktLjE5LjMxLjEyLjUxLjQyLjUxLjc1djQuNWMwIC40MS0uMzQuNzUtLjc1Ljc1aC0uNWMtLjQxIDAtLjc1LS4zNC0uNzUtLjc1di0yLjM4bC0yLjgxIDMuNTJ6Ii8+PC9zdmc+'}" 
                                 alt="${station.title}" 
                                 class="w-full h-full object-cover" 
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6bS01LjUtNC4yNWwtMS45LTEuNDVjLS4yNS0uMzEtLjE5LS43NS4xMi0xLjAxLjMxLS4yNS43NS0uMTkgMS4wMS4xMmwxLjI0IDEuNTYgMy4wNC0zLjc1Yy4yLS4yNS41OC0uMzEuODktLjE5LjMxLjEyLjUxLjQyLjUxLjc1djQuNWMwIC40MS0uMzQuNzUtLjc1Ljc1aC0uNWMtLjQxIDAtLjc1LS4zNC0uNzUtLjc1di0yLjM4bC0yLjgxIDMuNTJ6Ii8+PC9zdmc+'">
                        </div>
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">${station.title}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">${station.description || ''}</div>
                        </div>
                    </div>
                    ${station.isCustom ? `
                    <button class="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" 
                            data-action="remove" 
                            data-station-id="${station.id}">
                        <i class="fas fa-times"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        // Add click handlers for station selection and removal
        this.dom.stationsContainer.querySelectorAll('.radio-station').forEach(el => {
            el.addEventListener('click', (e) => {
                // Don't trigger if clicking on remove button
                if (e.target.closest('[data-action="remove"]')) {
                    e.stopPropagation();
                    return;
                }
                
                const stationId = el.dataset.id;
                this.playStation(stationId);
            });
        });
        
        // Add click handlers for remove buttons
        this.dom.stationsContainer.querySelectorAll('[data-action="remove"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const stationId = btn.dataset.stationId;
                this.removeStation(stationId);
            });
        });
    },
    
    // Show the add station modal
    showAddStationModal: function() {
        // In a real app, this would show a modal for adding a new station
        // For now, we'll just log to the console
        console.log('Show add station modal');
        
        // Example of how to add a station programmatically:
        /*
        const newStation = {
            id: 'custom-' + Date.now(),
            title: 'Custom Station',
            description: 'Your custom station',
            url: 'https://example.com/stream',
            cover: 'https://via.placeholder.com/150',
            isCustom: true
        };
        
        this.stations.push(newStation);
        this.saveStations();
        this.updateUI();
        */
        
        // For now, let's just show an alert
        alert('In a real app, this would show a form to add a new station.');
    },
    
    // Remove a station
    removeStation: function(stationId) {
        const index = this.stations.findIndex(s => s.id === stationId);
        if (index === -1) return;
        
        // Don't allow removing default stations
        if (!this.stations[index].isCustom) {
            alert('Default stations cannot be removed');
            return;
        }
        
        // If the station being removed is currently playing, stop it
        if (this.currentStation && this.currentStation.id === stationId) {
            this.pause();
            this.currentStation = null;
        }
        
        // Remove the station
        this.stations.splice(index, 1);
        this.saveStations();
        this.updateUI();
    },
    
    // Refresh stations
    refreshStations: function() {
        // In a real app, this would fetch updated station data from a server
        console.log('Refreshing stations...');
        // For now, just reload the page to see the effect
        window.location.reload();
    },
    
    // Extract YouTube video ID from URL
    extractYouTubeId: function(url) {
        if (!url) return null;
        
        // Handle youtu.be links
        if (url.includes('youtu.be/')) {
            return url.split('youtu.be/')[1].split(/[?&#]/)[0];
        }
        
        // Handle youtube.com links
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        
        return (match && match[2].length === 11) ? match[2] : null;
    }
};

// Initialize the music player when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    musicPlayer.init();
});

// Make the music player available globally
window.MusicPlayer = musicPlayer;
