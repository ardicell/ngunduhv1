document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const downloadBtn = document.getElementById('downloadBtn');
    const mediaUrlInput = document.getElementById('mediaUrl');
    const resultSection = document.querySelector('.result-section');
    const mediaThumb = document.getElementById('mediaThumb');
    const mediaTitle = document.getElementById('mediaTitle');
    const mediaMeta = document.getElementById('mediaMeta');
    const qualityList = document.getElementById('qualityList');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const aboutBtn = document.getElementById('aboutBtn');
    const helpBtn = document.getElementById('helpBtn');
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    const aboutModal = document.getElementById('aboutModal');
    const closeModal = document.querySelector('.close-modal');
    
    // State
    let isLoading = false;
    
    // Initialize
    initApp();
    
    function initApp() {
        // Load theme preference
        loadTheme();
        
        // Load download history
        loadHistory();
        
        // Event listeners
        setupEventListeners();
    }
    
    function setupEventListeners() {
        // Theme toggle
        themeToggle.addEventListener('change', toggleTheme);
        
        // Download button
        downloadBtn.addEventListener('click', handleDownload);
        mediaUrlInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') handleDownload();
        });
        
        // History
        clearHistoryBtn.addEventListener('click', clearHistory);
        
        // Modals
        aboutBtn.addEventListener('click', () => toggleModal(aboutModal, true));
        helpBtn.addEventListener('click', () => alert('Tempel URL media sosial di input box dan klik "Ekstrak Media"'));
        closeModal.addEventListener('click', () => toggleModal(aboutModal, false));
        
        // Click outside modal to close
        window.addEventListener('click', e => {
            if (e.target === aboutModal) toggleModal(aboutModal, false);
        });
    }
    
    // Theme functions
    function loadTheme() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        document.body.classList.toggle('dark-mode', isDarkMode);
        themeToggle.checked = isDarkMode;
        themeLabel.textContent = isDarkMode ? 'Mode Terang' : 'Mode Gelap';
    }
    
    function toggleTheme() {
        const isDarkMode = themeToggle.checked;
        document.body.classList.toggle('dark-mode', isDarkMode);
        localStorage.setItem('darkMode', isDarkMode);
        themeLabel.textContent = isDarkMode ? 'Mode Terang' : 'Mode Gelap';
    }
    
    // Download functions
    async function handleDownload() {
        const url = mediaUrlInput.value.trim();
        if (!url) {
            showError('Silakan masukkan URL media sosial');
            return;
        }
        
        if (!isValidUrl(url)) {
            showError('URL tidak valid');
            return;
        }
        
        try {
            setLoading(true);
            resultSection.classList.add('hidden');
            
            const response = await fetch(`/download?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            displayResults(data);
            saveToHistory(url, data.title, data.thumbnail);
        } catch (err) {
            showError(`Error: ${err.message}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }
    
    function displayResults(data) {
        // Set media info
        mediaTitle.textContent = data.title || 'Media Sosial';
        mediaThumb.src = data.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="%23666" d="M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5m16 1V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/%3E%3C/svg%3E';
        
        // Show play icon for videos
        const playIcon = document.querySelector('.play-icon');
        playIcon.classList.toggle('hidden', data.type !== 'video');
        
        if (playIcon && !playIcon.classList.contains('hidden')) {
            playIcon.onclick = () => {
                window.open(data.sources[0].url, '_blank');
            };
        }
        
        // Set metadata
        if (data.meta) {
            mediaMeta.innerHTML = '';
            
            if (data.meta.platform) {
                const platformEl = document.createElement('div');
                platformEl.className = 'meta-item';
                platformEl.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8z"/></svg>
                    ${data.meta.platform}
                `;
                mediaMeta.appendChild(platformEl);
            }
            
            if (data.meta.duration) {
                const durationEl = document.createElement('div');
                durationEl.className = 'meta-item';
                durationEl.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 20c4.4 0 8-3.6 8-8s-3.6-8-8-8s-8 3.6-8 8s3.6 8 8 8m0-18c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12S6.5 2 12 2m.5 5v5.2l4.5 2.7l-.8 1.2L11 13V7h1.5z"/></svg>
                    ${formatDuration(data.meta.duration)}
                `;
                mediaMeta.appendChild(durationEl);
            }
            
            if (data.meta.likes) {
                const likesEl = document.createElement('div');
                likesEl.className = 'meta-item';
                likesEl.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M23 10a2 2 0 0 0-2-2h-6.32l.96-4.57c.02-.1.03-.21.03-.32c0-.41-.17-.79-.44-1.06L14.17 1L7.59 7.58C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2M1 21h4V9H1v12z"/></svg>
                    ${formatNumber(data.meta.likes)}
                `;
                mediaMeta.appendChild(likesEl);
            }
        }
        
        // Set download options
        qualityList.innerHTML = '';
        data.sources.forEach((source, index) => {
            const card = document.createElement('div');
            card.className = 'quality-card';
            card.innerHTML = `
                <div class="quality-header">
                    <span class="quality-name">${source.quality}</span>
                    ${source.size ? `<span class="quality-size">${source.size}</span>` : ''}
                </div>
                <a href="${source.download}" download target="_blank" class="download-btn">
                    Download
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7l7-7z"/></svg>
                </a>
            `;
            qualityList.appendChild(card);
        });
        
        // Show results
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // History functions
    function saveToHistory(url, title, thumbnail) {
        const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        
        // Remove if already exists
        const existingIndex = history.findIndex(item => item.url === url);
        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }
        
        // Add new item
        const newItem = {
            id: Date.now(),
            url,
            title,
            thumbnail,
            timestamp: new Date().toISOString()
        };
        
        // Add to beginning and limit to 20 items
        history.unshift(newItem);
        if (history.length > 20) history.pop();
        
        localStorage.setItem('downloadHistory', JSON.stringify(history));
        loadHistory();
    }
    
    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        historyList.innerHTML = '';
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="empty-history">Tidak ada riwayat download</div>';
            return;
        }
        
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-info">
                    <div class="history-title">${item.title || 'Media Sosial'}</div>
                    <div class="history-url">${item.url}</div>
                </div>
                <div class="history-actions">
                    <a href="#" class="history-btn" data-url="${item.url}" title="Download lagi">
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7l7-7z"/></svg>
                    </a>
                </div>
            `;
            historyList.appendChild(historyItem);
        });
        
        // Add event listeners to history items
        document.querySelectorAll('.history-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const url = btn.getAttribute('data-url');
                mediaUrlInput.value = url;
                handleDownload();
            });
        });
    }
    
    function clearHistory() {
        if (confirm('Apakah Anda yakin ingin menghapus semua riwayat?')) {
            localStorage.removeItem('downloadHistory');
            loadHistory();
        }
    }
    
    // Helper functions
    function setLoading(state) {
        isLoading = state;
        const btnText = downloadBtn.querySelector('.btn-text');
        const loader = downloadBtn.querySelector('.loader');
        
        if (state) {
            btnText.textContent = 'Memproses...';
            loader.classList.remove('hidden');
            downloadBtn.disabled = true;
        } else {
            btnText.textContent = 'Ekstrak Media';
            loader.classList.add('hidden');
            downloadBtn.disabled = false;
        }
    }
    
    function showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        
        // Remove existing errors
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        
        // Insert after input
        mediaUrlInput.parentNode.insertBefore(errorEl, mediaUrlInput.nextSibling);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            errorEl.remove();
        }, 5000);
    }
    
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    function formatDuration(duration) {
        // ISO 8601 duration format (e.g., PT1H30M15S)
        const matches = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!matches) return duration;
        
        const hours = parseInt(matches[1]) || 0;
        const minutes = parseInt(matches[2]) || 0;
        const seconds = parseInt(matches[3]) || 0;
        
        const parts = [];
        if (hours) parts.push(`${hours} jam`);
        if (minutes) parts.push(`${minutes} menit`);
        if (seconds) parts.push(`${seconds} detik`);
        
        return parts.join(' ') || '0 detik';
    }
    
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + ' jt';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + ' rb';
        }
        return num.toString();
    }
    
    function toggleModal(modal, show) {
        if (show) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } else {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
});