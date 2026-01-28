/**
 * Admin System Module
 * Handles secret admin panel, configuration persistence, and hotkey activation
 */

class AdminSystem {
    constructor() {
        // Secret key combination: Ctrl + Shift + H
        this.secretCombo = { ctrl: true, shift: true, key: 'h' };
        this.keysPressed = { ctrl: false, shift: false };

        // Configuration
        this.config = {
            gestures: {
                thumbsUpThreshold: 50,
                openPalmThreshold: 50,
                cooldownMs: 1500
            },
            actions: {
                thumbsUp: 'play',
                openPalm: 'pause'
            },
            video: {
                url: 'assets/cyberloop.mp4'
            }
        };

        // Default config for reset
        this.defaultConfig = JSON.parse(JSON.stringify(this.config));

        // Storage key
        this.storageKey = 'wallPaperConfig';

        // UI Elements
        this.overlay = null;
        this.panel = null;

        // Callbacks
        this.onConfigChange = null;

        // Bound methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    init() {
        // Get UI elements
        this.overlay = document.getElementById('admin-overlay');
        this.panel = document.getElementById('admin-panel');

        // Load saved config
        this.loadConfig();

        // Setup key listeners
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);

        // Setup UI event listeners
        this.setupUIListeners();

        // Update UI with loaded config
        this.updateUI();

        console.log('Admin system initialized. Press Ctrl+Shift+H to open admin panel.');
    }

    handleKeyDown(e) {
        if (e.key === 'Control') this.keysPressed.ctrl = true;
        if (e.key === 'Shift') this.keysPressed.shift = true;

        // Check for secret combo
        if (this.keysPressed.ctrl && this.keysPressed.shift &&
            e.key.toLowerCase() === this.secretCombo.key) {
            e.preventDefault();
            this.togglePanel();
        }

        // Escape to close panel
        if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
            this.hidePanel();
        }
    }

    handleKeyUp(e) {
        if (e.key === 'Control') this.keysPressed.ctrl = false;
        if (e.key === 'Shift') this.keysPressed.shift = false;
    }

    togglePanel() {
        if (this.overlay.classList.contains('hidden')) {
            this.showPanel();
        } else {
            this.hidePanel();
        }
    }

    showPanel() {
        this.overlay.classList.remove('hidden');
        this.updateUI();
    }

    hidePanel() {
        this.overlay.classList.add('hidden');
    }

    setupUIListeners() {
        // Close button
        const closeBtn = document.getElementById('admin-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hidePanel());
        }

        // Click outside to close
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.hidePanel();
                }
            });
        }

        // Gesture thresholds
        const thumbThreshold = document.getElementById('thumb-threshold');
        const palmThreshold = document.getElementById('palm-threshold');
        const cooldown = document.getElementById('gesture-cooldown');

        if (thumbThreshold) {
            thumbThreshold.addEventListener('input', (e) => {
                this.config.gestures.thumbsUpThreshold = parseInt(e.target.value);
                this.updateValueDisplay('thumb-value', e.target.value);
                this.emitConfigChange();
            });
        }

        if (palmThreshold) {
            palmThreshold.addEventListener('input', (e) => {
                this.config.gestures.openPalmThreshold = parseInt(e.target.value);
                this.updateValueDisplay('palm-value', e.target.value);
                this.emitConfigChange();
            });
        }

        if (cooldown) {
            cooldown.addEventListener('change', (e) => {
                this.config.gestures.cooldownMs = parseInt(e.target.value);
                this.emitConfigChange();
            });
        }

        // Action mapping
        const thumbsAction = document.getElementById('thumbs-action');
        const palmAction = document.getElementById('palm-action');

        if (thumbsAction) {
            thumbsAction.addEventListener('change', (e) => {
                this.config.actions.thumbsUp = e.target.value;
                this.emitConfigChange();
            });
        }

        if (palmAction) {
            palmAction.addEventListener('change', (e) => {
                this.config.actions.openPalm = e.target.value;
                this.emitConfigChange();
            });
        }

        // Video source
        const videoUrl = document.getElementById('video-url');
        const applyVideo = document.getElementById('apply-video');

        if (applyVideo && videoUrl) {
            applyVideo.addEventListener('click', () => {
                const url = videoUrl.value.trim();
                if (url) {
                    this.config.video.url = url;
                    this.emitConfigChange();
                    this.showStatus('Video source updated!', 'success');
                }
            });
        }

        // Save/Reset buttons
        const saveBtn = document.getElementById('save-config');
        const resetBtn = document.getElementById('reset-config');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveConfig();
                this.showStatus('Configuration saved!', 'success');
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetConfig();
                this.showStatus('Configuration reset to defaults!', 'success');
            });
        }
    }

    updateValueDisplay(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    updateUI() {
        // Update sliders
        const thumbThreshold = document.getElementById('thumb-threshold');
        const palmThreshold = document.getElementById('palm-threshold');
        const cooldown = document.getElementById('gesture-cooldown');

        if (thumbThreshold) {
            thumbThreshold.value = this.config.gestures.thumbsUpThreshold;
            this.updateValueDisplay('thumb-value', thumbThreshold.value);
        }

        if (palmThreshold) {
            palmThreshold.value = this.config.gestures.openPalmThreshold;
            this.updateValueDisplay('palm-value', palmThreshold.value);
        }

        if (cooldown) {
            cooldown.value = this.config.gestures.cooldownMs;
        }

        // Update dropdowns
        const thumbsAction = document.getElementById('thumbs-action');
        const palmAction = document.getElementById('palm-action');

        if (thumbsAction) thumbsAction.value = this.config.actions.thumbsUp;
        if (palmAction) palmAction.value = this.config.actions.openPalm;

        // Update video URL
        const videoUrl = document.getElementById('video-url');
        if (videoUrl) videoUrl.value = this.config.video.url;
    }

    showStatus(message, type = 'success') {
        const status = document.getElementById('save-status');
        if (status) {
            status.textContent = message;
            status.className = `status-message ${type}`;

            setTimeout(() => {
                status.classList.add('hidden');
            }, 3000);
        }
    }

    emitConfigChange() {
        if (this.onConfigChange) {
            this.onConfigChange(this.config);
        }
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
                console.log('Loaded config from localStorage');
            }
        } catch (error) {
            console.warn('Failed to load config:', error);
        }
    }

    saveConfig() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            console.log('Config saved to localStorage');
        } catch (error) {
            console.error('Failed to save config:', error);
            this.showStatus('Failed to save configuration!', 'error');
        }
    }

    resetConfig() {
        this.config = JSON.parse(JSON.stringify(this.defaultConfig));
        localStorage.removeItem(this.storageKey);
        this.updateUI();
        this.emitConfigChange();
    }

    getConfig() {
        return { ...this.config };
    }

    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }
}

// Export for module use
export default AdminSystem;
export { AdminSystem };
