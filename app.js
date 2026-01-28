/**
 * Main Application Controller
 * Ties together face tracking, hand gestures, 3D rendering, and admin system
 */

import FaceTracker from './faceTracker.js';
import HandGestureTracker from './handGesture.js';
import Renderer3D from './renderer3D.js';
import AdminSystem from './adminSystem.js';

class App {
    constructor() {
        // Modules
        this.faceTracker = null;
        this.handGesture = null;
        this.renderer = null;
        this.adminSystem = null;

        // State
        this.isRunning = false;
        this.debugMode = false;
        this.userInteracted = false;

        // FPS tracking
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fps = 0;

        // UI Elements
        this.fpsCounter = null;
        this.trackingStatus = null;
        this.gestureStatus = null;
        this.headPositionDisplay = null;

        // Animation frame ID
        this.animationId = null;

        // Message timeout ID
        this.messageTimeout = null;
    }

    async init() {
        console.log('Initializing 3D Parallax Cyber Room...');

        // Initialize renderer first (doesn't need permissions)
        this.renderer = new Renderer3D();
        this.renderer.init();

        // Initialize admin system
        this.adminSystem = new AdminSystem();
        this.adminSystem.init();
        this.adminSystem.onConfigChange = (config) => this.applyConfig(config);

        // Apply saved config
        const savedConfig = this.adminSystem.getConfig();
        this.applyConfig(savedConfig);

        // Initialize trackers
        this.faceTracker = new FaceTracker();
        this.handGesture = new HandGestureTracker();

        // Setup UI
        this.setupUI();

        // Setup user interaction handler (for audio unmuting)
        this.setupInteractionHandler();

        // Try to initialize tracking
        await this.initTracking();

        // Start animation loop
        this.start();

        console.log('Application initialized!');
    }

    async initTracking() {
        try {
            // Initialize face tracker
            const faceResult = await this.faceTracker.init();

            if (faceResult) {
                // Initialize hand gesture with same video element
                await this.handGesture.init(this.faceTracker.video);

                // Setup gesture callback (legacy)
                this.handGesture.onGestureDetected = (action, gesture) => {
                    this.handleGestureAction(action, gesture);
                };

                // Setup finger count callback for birthday messages
                this.handGesture.onFingerCountDetected = (fingerCount, message) => {
                    this.showFingerMessage(fingerCount, message);
                };

                // Start trackers
                this.faceTracker.start();
                this.handGesture.start();

                // Update status
                this.updateTrackingStatus(true);

                console.log('Tracking initialized successfully');
            } else {
                console.warn('Face tracking failed to initialize');
                this.updateTrackingStatus(false);
            }
        } catch (error) {
            console.error('Failed to initialize tracking:', error);
            this.updateTrackingStatus(false);
        }
    }

    showFingerMessage(fingerCount, message) {
        console.log(`Finger count: ${fingerCount} - Message: ${message}`);

        // Mark as user interacted
        this.userInteracted = true;

        // Get message overlay elements
        const overlay = document.getElementById('message-overlay');
        const fingerCountEl = document.getElementById('finger-count');
        const messageTextEl = document.getElementById('message-text');

        if (!overlay || !fingerCountEl || !messageTextEl) return;

        // Update content
        fingerCountEl.textContent = fingerCount;
        messageTextEl.textContent = message;

        // Show overlay
        overlay.classList.remove('hidden', 'fade-out');

        // Update debug display
        if (this.gestureStatus) {
            this.gestureStatus.textContent = `Fingers: ${fingerCount}`;
            this.gestureStatus.style.color = '#ff6b9d';
            setTimeout(() => {
                this.gestureStatus.style.color = '';
            }, 500);
        }

        // Auto-hide after 8 seconds
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        this.messageTimeout = setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 500);
        }, 8000);

        // Also allow click to dismiss
        overlay.onclick = () => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 500);
        };
    }

    setupUI() {
        // Get elements
        this.fpsCounter = document.getElementById('fps-counter');
        this.trackingStatus = document.getElementById('tracking-status');
        this.gestureStatus = document.getElementById('gesture-status');
        this.headPositionDisplay = document.getElementById('head-position');

        // Setup panel toggle functionality
        this.setupPanelToggle();

        // Parallax intensity slider
        const parallaxSlider = document.getElementById('parallax-intensity');
        const parallaxValue = document.getElementById('parallax-value');

        if (parallaxSlider) {
            parallaxSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (parallaxValue) parallaxValue.textContent = value;
                this.renderer.setParallaxIntensity(value);
            });
        }

        // Smoothing slider
        const smoothingSlider = document.getElementById('smoothing');
        const smoothingValue = document.getElementById('smoothing-value');

        if (smoothingSlider) {
            smoothingSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (smoothingValue) smoothingValue.textContent = value;
                this.faceTracker.setSmoothing(value);
                this.renderer.setSmoothing(value);
            });
        }

        // Grid detail slider
        const gridSlider = document.getElementById('grid-detail');
        const gridValue = document.getElementById('grid-value');

        if (gridSlider) {
            gridSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (gridValue) gridValue.textContent = value;
                this.renderer.setGridDetail(value);
            });
        }

        // Performance mode checkbox
        const performanceMode = document.getElementById('performance-mode');

        if (performanceMode) {
            performanceMode.addEventListener('change', (e) => {
                this.renderer.setPerformanceMode(e.target.checked);

                // Also reduce tracking frequency in performance mode
                if (e.target.checked) {
                    this.faceTracker.setUpdateInterval(100);
                    this.handGesture.setUpdateInterval(150);
                } else {
                    this.faceTracker.setUpdateInterval(50);
                    this.handGesture.setUpdateInterval(100);
                }
            });
        }

        // Debug mode checkbox
        const debugMode = document.getElementById('debug-mode');
        const debugOverlay = document.getElementById('debug-overlay');

        if (debugMode) {
            debugMode.addEventListener('change', (e) => {
                this.debugMode = e.target.checked;
                if (debugOverlay) {
                    debugOverlay.classList.toggle('hidden', !this.debugMode);
                }
            });
        }

        // Start Video button
        const startVideoBtn = document.getElementById('start-video-btn');
        if (startVideoBtn) {
            startVideoBtn.addEventListener('click', () => {
                this.userInteracted = true;
                this.renderer.playVideo();
                startVideoBtn.textContent = '⏸ Pause Video';
                startVideoBtn.classList.add('playing');

                // Toggle functionality
                startVideoBtn.onclick = () => {
                    if (this.renderer.isVideoPlaying) {
                        this.renderer.pauseVideo();
                        startVideoBtn.textContent = '▶ Start Video';
                        startVideoBtn.classList.remove('playing');
                    } else {
                        this.renderer.playVideo();
                        startVideoBtn.textContent = '⏸ Pause Video';
                        startVideoBtn.classList.add('playing');
                    }
                };
            });
        }
    }

    setupPanelToggle() {
        const controlPanel = document.getElementById('control-panel');
        const closeBtn = document.getElementById('panel-close-btn');
        const toggleBtn = document.getElementById('toggle-panel-btn');

        if (closeBtn && controlPanel && toggleBtn) {
            // Close button - hide panel
            closeBtn.addEventListener('click', () => {
                controlPanel.classList.add('hidden');
                toggleBtn.classList.remove('hidden');
            });

            // Toggle button - show panel
            toggleBtn.addEventListener('click', () => {
                controlPanel.classList.remove('hidden');
                toggleBtn.classList.add('hidden');
            });
        }
    }

    setupInteractionHandler() {
        // Handle first user interaction to unmute video
        const handleInteraction = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                this.renderer.unmuteVideo();
                console.log('User interaction detected, audio enabled');
            }
        };

        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });
    }

    handleGestureAction(action, gesture) {
        console.log(`Gesture detected: ${gesture} -> Action: ${action}`);

        // Mark as user interacted (important for autoplay policy)
        this.userInteracted = true;

        // Update debug display
        if (this.gestureStatus) {
            this.gestureStatus.textContent = `Gesture: ${gesture}`;

            // Flash effect
            this.gestureStatus.style.color = '#00ff88';
            setTimeout(() => {
                this.gestureStatus.style.color = '';
            }, 500);
        }

        // Update button state
        const startVideoBtn = document.getElementById('start-video-btn');

        // Execute action
        switch (action) {
            case 'play':
                this.renderer.playVideo();
                if (startVideoBtn) {
                    startVideoBtn.textContent = '⏸ Pause Video';
                    startVideoBtn.classList.add('playing');
                }
                break;
            case 'pause':
                this.renderer.pauseVideo();
                if (startVideoBtn) {
                    startVideoBtn.textContent = '▶ Start Video';
                    startVideoBtn.classList.remove('playing');
                }
                break;
        }
    }

    applyConfig(config) {
        // Apply gesture configuration
        if (config.gestures) {
            if (this.handGesture) {
                this.handGesture.setThreshold('thumbsUp', config.gestures.thumbsUpThreshold || 50);
                this.handGesture.setThreshold('openPalm', config.gestures.openPalmThreshold || 50);
                this.handGesture.setThreshold('fingerExtension', config.gestures.fingerSensitivity || 50);
                this.handGesture.setCooldown(config.gestures.cooldownMs || 3000);
            }
        }

        // Apply action mapping for video control
        if (config.actions) {
            if (this.handGesture) {
                this.handGesture.setActionMapping('thumbsUp', config.actions.thumbsUp);
                this.handGesture.setActionMapping('openPalm', config.actions.openPalm);
            }
        }

        // Apply video source
        if (config.video && config.video.url) {
            if (this.renderer) {
                this.renderer.setVideoSource(config.video.url);
            }
        }
    }

    updateTrackingStatus(active) {
        if (this.trackingStatus) {
            this.trackingStatus.classList.toggle('active', active);
        }
    }

    updateFPS(timestamp) {
        this.frameCount++;

        if (timestamp - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = timestamp;

            if (this.fpsCounter) {
                this.fpsCounter.textContent = `FPS: ${this.fps}`;
            }
        }
    }

    updateDebugInfo() {
        if (!this.debugMode) return;

        // Update head position display
        if (this.headPositionDisplay && this.faceTracker) {
            const pos = this.faceTracker.getHeadPosition();
            this.headPositionDisplay.textContent =
                `Head: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`;
        }

        // Update gesture status
        if (this.gestureStatus && this.handGesture) {
            const gesture = this.handGesture.getCurrentGesture();
            if (!gesture) {
                this.gestureStatus.textContent = 'Gesture: None';
            }
        }
    }

    animate(timestamp) {
        if (!this.isRunning) return;

        // Update FPS
        this.updateFPS(timestamp);

        // Update face tracking
        if (this.faceTracker) {
            this.faceTracker.update(timestamp);

            // Get head position and update camera
            const headPos = this.faceTracker.getHeadPosition();
            this.renderer.updateCamera(headPos);
        }

        // Update hand gesture tracking
        if (this.handGesture) {
            this.handGesture.update(timestamp);
        }

        // Update debug info
        this.updateDebugInfo();

        // Render scene
        this.renderer.render();

        // Continue loop
        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    start() {
        this.isRunning = true;
        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    destroy() {
        this.stop();

        if (this.faceTracker) this.faceTracker.destroy();
        if (this.handGesture) this.handGesture.destroy();
        if (this.renderer) this.renderer.destroy();
        if (this.adminSystem) this.adminSystem.destroy();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();

    // Expose for debugging
    window.app = app;
});
