/**
 * Hand Gesture Recognition Module
 * Uses MediaPipe Hands for gesture detection with cooldown system
 * Updated: Finger counting (1-5 fingers) with custom messages + Thumbs up/Open palm for video control
 */

class HandGestureTracker {
    constructor() {
        this.gestureRecognizer = null;
        this.video = null;
        this.isInitialized = false;
        this.isRunning = false;

        // Current gesture state
        this.currentGesture = null;
        this.currentFingerCount = 0;
        this.landmarks = null;

        // Cooldown system (separate cooldowns for video control and messages)
        this.lastGestureTime = 0;
        this.lastVideoGestureTime = 0;
        this.cooldownMs = 3000; // Cooldown for finger messages
        this.videoCooldownMs = 1500; // Cooldown for video control

        // Gesture thresholds (0-100, mapped to actual values)
        this.thresholds = {
            fingerExtension: 50,  // Sensitivity for finger detection
            thumbsUp: 50,
            openPalm: 50
        };

        // Action mapping for video control
        this.actionMapping = {
            thumbsUp: 'play',
            openPalm: 'pause'
        };

        // Finger count to message mapping
        this.fingerMessages = {
            1: "Alooo ancwaa cayaang… <3, Iyaaaa kamu sayaang, kecayangan aku, cantiknaa aku duniaanaa akuu, masa depannaa akuu <3",
            2: "Selamat ulang tahun ke-23 cintaakuuuu, di hari yang berbahagia ini aku mau mengajak kamu berterima kasih kepada Allah SWT karena telah memilih untuk menjadikan hari ini sebagai hari lahir kamu manusia favorite aku di dunia ini",
            3: "Banyak banget hal hal yang sudah kita lalui di tahun kemarin, banyak suka duka dan pelajaran yang bisa di ambil dan di resapi, tapi kamu harus pastikan penilaian aku ke kamu nda akan pernah berubah dan bahkan selalu bertambah baik semenjak kita pertama ketemu sayaang, aku sangat amat bersyukur bisa bertemu dan bisa selalu membahagiakan kecayangan aku yang paling cantik ini",
            4: "Semoga kamu selalu diberikan kesehatan yang luar biasa, baik lahir maupun batin. Semoga Allah SWT selalu menjagamu, melindungimu di setiap langkah, dan melimpahkan keberkahan dalam setiap urusanmu. Aku ingin kita terus bersama, melewati tahun-tahun berikutnya dengan penuh cinta.",
            5: ""
        };

        // Callbacks
        this.onGestureDetected = null;
        this.onFingerCountDetected = null;

        // Debug
        this.debugCanvas = null;
        this.debugCtx = null;

        // Update interval
        this.updateInterval = 100;
        this.lastUpdateTime = 0;
    }

    async init(videoElement) {
        try {
            this.video = videoElement || document.getElementById('debugWebcam');

            if (!this.video) {
                console.warn('No video element for hand tracking');
                return false;
            }

            // Setup debug canvas
            this.debugCanvas = document.getElementById('debugCanvas');
            if (this.debugCanvas) {
                this.debugCtx = this.debugCanvas.getContext('2d');
            }

            // Initialize MediaPipe Hands using GestureRecognizer
            await this.initMediaPipe();

            this.isInitialized = true;
            console.log('Hand gesture tracker initialized');
            return true;

        } catch (error) {
            console.error('Failed to initialize hand gesture tracker:', error);
            return false;
        }
    }

    async initMediaPipe() {
        const vision = await window.MediaPipeVision.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        this.gestureRecognizer = await window.MediaPipeVision.GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
    }

    start() {
        if (!this.isInitialized) {
            console.warn('Hand gesture tracker not initialized');
            return;
        }
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
    }

    update(timestamp) {
        if (!this.isRunning || !this.gestureRecognizer || !this.video) return;

        // Throttle updates
        if (timestamp - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        this.lastUpdateTime = timestamp;

        try {
            const results = this.gestureRecognizer.recognizeForVideo(this.video, timestamp);

            if (results.landmarks && results.landmarks.length > 0) {
                this.landmarks = results.landmarks[0];

                // 1. Check for video control gestures (thumbs up / open palm)
                const videoGesture = this.detectVideoGesture(this.landmarks);
                if (videoGesture && this.canTriggerVideoGesture(timestamp)) {
                    this.currentGesture = videoGesture;
                    this.lastVideoGestureTime = timestamp;
                    this.triggerVideoAction(videoGesture);
                }

                // 2. Check for Love Sign gesture (for message 5)
                if (this.isLoveSign(this.landmarks) && this.canTriggerMessageGesture(timestamp)) {
                    this.currentGesture = 'love_sign';
                    this.currentFingerCount = 5;
                    this.lastGestureTime = timestamp;
                    this.triggerFingerCountAction(5);
                }
                // 3. Count extended fingers for birthday messages (1-4 only)
                else {
                    const fingerCount = this.countExtendedFingers(this.landmarks);
                    this.currentFingerCount = fingerCount;

                    // Only trigger message if 1-4 fingers and cooldown passed
                    if (fingerCount >= 1 && fingerCount <= 4 && this.canTriggerMessageGesture(timestamp)) {
                        this.currentGesture = `${fingerCount}_finger${fingerCount > 1 ? 's' : ''}`;
                        this.lastGestureTime = timestamp;
                        this.triggerFingerCountAction(fingerCount);
                    }
                }

                // Draw debug overlay
                this.drawDebug();
            } else {
                this.landmarks = null;
                this.currentGesture = null;
                this.currentFingerCount = 0;
            }
        } catch (error) {
            // Silently handle detection errors
        }
    }

    /**
     * Detect thumbs up or open palm for video control
     */
    detectVideoGesture(landmarks) {
        const thumbThreshold = (100 - this.thresholds.thumbsUp) / 500;
        const palmThreshold = (100 - this.thresholds.openPalm) / 500;

        // Check Thumbs Up
        if (this.isThumbsUp(landmarks, thumbThreshold)) {
            return 'thumbsUp';
        }

        // Check Open Palm
        if (this.isOpenPalm(landmarks, palmThreshold)) {
            return 'openPalm';
        }

        return null;
    }

    isThumbsUp(landmarks, threshold) {
        // Thumb landmarks: 1 (base), 2 (knuckle), 3 (middle), 4 (tip)
        // Check if thumb tip is significantly higher than knuckle
        const thumbTip = landmarks[4];
        const thumbKnuckle = landmarks[2];
        const thumbUp = thumbTip.y < thumbKnuckle.y - threshold;

        // Check if other fingers are curled (tips below middle joints)
        const indexCurled = landmarks[8].y > landmarks[6].y;
        const middleCurled = landmarks[12].y > landmarks[10].y;
        const ringCurled = landmarks[16].y > landmarks[14].y;
        const pinkyCurled = landmarks[20].y > landmarks[18].y;

        return thumbUp && indexCurled && middleCurled && ringCurled && pinkyCurled;
    }

    isOpenPalm(landmarks, threshold) {
        // Check if all fingers are extended (tips above knuckles)
        const indexExtended = landmarks[8].y < landmarks[6].y - threshold;
        const middleExtended = landmarks[12].y < landmarks[10].y - threshold;
        const ringExtended = landmarks[16].y < landmarks[14].y - threshold;
        const pinkyExtended = landmarks[20].y < landmarks[18].y - threshold;

        // Thumb extended outward
        const thumbExtended = landmarks[4].x < landmarks[3].x - threshold ||
            landmarks[4].x > landmarks[3].x + threshold;

        return indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended;
    }

    /**
     * Detect "I Love You" sign 🤟
     * Thumb, Index, and Pinky extended; Middle and Ring curled
     * @param {Array} landmarks - Hand landmarks from MediaPipe
     * @returns {boolean} True if Love Sign detected
     */
    isLoveSign(landmarks) {
        const threshold = (100 - this.thresholds.fingerExtension) / 500;

        // Thumb extended (sideways)
        const thumbExtended = Math.abs(landmarks[4].x - landmarks[3].x) > threshold;

        // Index finger extended (tip above PIP joint)
        const indexExtended = landmarks[8].y < landmarks[6].y - threshold;

        // Middle finger curled (tip below PIP joint)
        const middleCurled = landmarks[12].y > landmarks[10].y;

        // Ring finger curled (tip below PIP joint)
        const ringCurled = landmarks[16].y > landmarks[14].y;

        // Pinky extended (tip above PIP joint)
        const pinkyExtended = landmarks[20].y < landmarks[18].y - threshold;

        return thumbExtended && indexExtended && middleCurled && ringCurled && pinkyExtended;
    }

    /**
     * Count how many fingers are extended
     * @param {Array} landmarks - Hand landmarks from MediaPipe
     * @returns {number} Number of extended fingers (0-5)
     */
    countExtendedFingers(landmarks) {
        const threshold = (100 - this.thresholds.fingerExtension) / 500;
        let count = 0;

        // Check thumb (special case - extends sideways)
        // Thumb tip (4) should be to the left/right of thumb IP joint (3)
        const thumbExtended = Math.abs(landmarks[4].x - landmarks[3].x) > threshold;
        if (thumbExtended) count++;

        // Check index finger (tip 8 above PIP joint 6)
        if (landmarks[8].y < landmarks[6].y - threshold) count++;

        // Check middle finger (tip 12 above PIP joint 10)
        if (landmarks[12].y < landmarks[10].y - threshold) count++;

        // Check ring finger (tip 16 above PIP joint 14)
        if (landmarks[16].y < landmarks[14].y - threshold) count++;

        // Check pinky finger (tip 20 above PIP joint 18)
        if (landmarks[20].y < landmarks[18].y - threshold) count++;

        return count;
    }

    canTriggerVideoGesture(timestamp) {
        return timestamp - this.lastVideoGestureTime > this.videoCooldownMs;
    }

    canTriggerMessageGesture(timestamp) {
        return timestamp - this.lastGestureTime > this.cooldownMs;
    }

    triggerVideoAction(gesture) {
        const action = this.actionMapping[gesture];

        if (action && this.onGestureDetected) {
            this.onGestureDetected(action, gesture);
        }
    }

    triggerFingerCountAction(fingerCount) {
        const message = this.fingerMessages[fingerCount];

        if (message && this.onFingerCountDetected) {
            this.onFingerCountDetected(fingerCount, message);
        }
    }

    /**
     * Get the current message for a finger count
     * @param {number} fingerCount - 1-5
     * @returns {string} Message for that finger count
     */
    getMessageForFingerCount(fingerCount) {
        return this.fingerMessages[fingerCount] || null;
    }

    /**
     * Set a custom message for a finger count
     * @param {number} fingerCount - 1-5
     * @param {string} message - Custom message
     */
    setFingerMessage(fingerCount, message) {
        if (fingerCount >= 1 && fingerCount <= 5) {
            this.fingerMessages[fingerCount] = message;
        }
    }

    drawDebug() {
        if (!this.debugCtx || !this.landmarks || !this.debugCanvas) return;

        const ctx = this.debugCtx;
        const width = this.debugCanvas.width;
        const height = this.debugCanvas.height;

        // Draw hand landmarks
        ctx.fillStyle = '#00f0ff';

        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],           // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],           // Index
            [0, 9], [9, 10], [10, 11], [11, 12],      // Middle
            [0, 13], [13, 14], [14, 15], [15, 16],    // Ring
            [0, 17], [17, 18], [18, 19], [19, 20],    // Pinky
            [5, 9], [9, 13], [13, 17]                 // Palm
        ];

        ctx.strokeStyle = '#9d00ff';
        ctx.lineWidth = 2;

        connections.forEach(([i, j]) => {
            ctx.beginPath();
            ctx.moveTo(this.landmarks[i].x * width, this.landmarks[i].y * height);
            ctx.lineTo(this.landmarks[j].x * width, this.landmarks[j].y * height);
            ctx.stroke();
        });

        // Draw points
        this.landmarks.forEach((landmark, idx) => {
            ctx.beginPath();
            ctx.arc(landmark.x * width, landmark.y * height, 4, 0, Math.PI * 2);

            // Color fingertips differently
            if ([4, 8, 12, 16, 20].includes(idx)) {
                ctx.fillStyle = '#ff3366';
            } else {
                ctx.fillStyle = '#00f0ff';
            }
            ctx.fill();
        });

        // Draw current gesture text
        if (this.currentGesture) {
            ctx.font = '16px Arial';
            ctx.fillStyle = '#00ff88';
            ctx.fillText(`Gesture: ${this.currentGesture}`, 10, 30);
        }
    }

    // Configuration methods
    setThreshold(type, value) {
        if (this.thresholds.hasOwnProperty(type)) {
            this.thresholds[type] = value;
        }
    }

    setCooldown(ms) {
        this.cooldownMs = ms;
    }

    setVideoCooldown(ms) {
        this.videoCooldownMs = ms;
    }

    setActionMapping(gesture, action) {
        if (this.actionMapping.hasOwnProperty(gesture)) {
            this.actionMapping[gesture] = action;
        }
    }

    getActionMapping() {
        return { ...this.actionMapping };
    }

    getFingerMessages() {
        return { ...this.fingerMessages };
    }

    getCurrentGesture() {
        return this.currentGesture;
    }

    getFingerCount() {
        return this.currentFingerCount;
    }

    getLandmarks() {
        return this.landmarks;
    }

    setUpdateInterval(interval) {
        this.updateInterval = interval;
    }

    destroy() {
        this.stop();
        if (this.gestureRecognizer) {
            this.gestureRecognizer.close();
        }
    }
}

// Export for module use
export default HandGestureTracker;
export { HandGestureTracker };
