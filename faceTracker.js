/**
 * Face Tracker Module
 * Uses MediaPipe Face Detection with Kalman filtering for smooth head tracking
 */

// Kalman Filter for smoothing
class KalmanFilter {
    constructor(q = 0.1, r = 0.5) {
        this.x = 0;      // State estimate
        this.p = 1;      // Estimate error covariance
        this.q = q;      // Process noise
        this.r = r;      // Measurement noise
    }

    update(measurement) {
        // Prediction
        this.p += this.q;
        
        // Update
        const k = this.p / (this.p + this.r);
        this.x += k * (measurement - this.x);
        this.p *= (1 - k);
        
        return this.x;
    }

    setSmoothing(level) {
        // level 0-100: higher = smoother (more lag)
        this.r = 0.1 + (level / 100) * 2;
    }

    reset() {
        this.x = 0;
        this.p = 1;
    }
}

class FaceTracker {
    constructor() {
        this.detector = null;
        this.video = null;
        this.isInitialized = false;
        this.isRunning = false;
        
        // Head position
        this.headPosition = { x: 0, y: 0, z: 0 };
        this.rawPosition = { x: 0, y: 0, z: 0 };
        
        // Kalman filters for each axis
        this.filterX = new KalmanFilter();
        this.filterY = new KalmanFilter();
        this.filterZ = new KalmanFilter();
        
        // Configuration
        this.config = {
            mirrored: true,
            updateInterval: 50,  // ms between detections
            smoothing: 70
        };
        
        // Debug canvas
        this.debugCanvas = null;
        this.debugCtx = null;
        
        // Last update time for throttling
        this.lastUpdateTime = 0;
    }

    async init() {
        try {
            // Get webcam stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            // Setup video element
            this.video = document.getElementById('debugWebcam');
            if (!this.video) {
                this.video = document.createElement('video');
                this.video.style.display = 'none';
                document.body.appendChild(this.video);
            }
            this.video.srcObject = stream;
            await this.video.play();

            // Setup debug canvas
            this.debugCanvas = document.getElementById('debugCanvas');
            if (this.debugCanvas) {
                this.debugCanvas.width = this.video.videoWidth || 320;
                this.debugCanvas.height = this.video.videoHeight || 240;
                this.debugCtx = this.debugCanvas.getContext('2d');
            }

            // Initialize MediaPipe Face Detection
            await this.initMediaPipe();

            this.isInitialized = true;
            console.log('Face tracker initialized');
            return true;

        } catch (error) {
            console.error('Failed to initialize face tracker:', error);
            return false;
        }
    }

    async initMediaPipe() {
        // Load MediaPipe Vision
        const vision = await window.MediaPipeVision.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        this.detector = await window.MediaPipeVision.FaceDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.5
        });
    }

    start() {
        if (!this.isInitialized) {
            console.warn('Face tracker not initialized');
            return;
        }
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
    }

    update(timestamp) {
        if (!this.isRunning || !this.detector || !this.video) return;

        // Throttle updates
        if (timestamp - this.lastUpdateTime < this.config.updateInterval) {
            return;
        }
        this.lastUpdateTime = timestamp;

        try {
            const detections = this.detector.detectForVideo(this.video, timestamp);
            
            if (detections.detections && detections.detections.length > 0) {
                const face = detections.detections[0];
                const bbox = face.boundingBox;
                
                // Calculate center of face
                const centerX = bbox.originX + bbox.width / 2;
                const centerY = bbox.originY + bbox.height / 2;
                
                // Normalize to -1 to 1 range
                const videoWidth = this.video.videoWidth || 640;
                const videoHeight = this.video.videoHeight || 480;
                
                let normalizedX = (centerX / videoWidth) * 2 - 1;
                let normalizedY = (centerY / videoHeight) * 2 - 1;
                
                // Mirror X if needed
                if (this.config.mirrored) {
                    normalizedX = -normalizedX;
                }
                
                // Estimate Z based on face size (larger = closer)
                const faceSize = (bbox.width * bbox.height) / (videoWidth * videoHeight);
                const normalizedZ = Math.min(1, Math.max(-1, (faceSize - 0.05) * 10));
                
                // Store raw position
                this.rawPosition = {
                    x: normalizedX,
                    y: -normalizedY,  // Invert Y for natural feel
                    z: normalizedZ
                };
                
                // Apply Kalman filtering
                this.headPosition = {
                    x: this.filterX.update(this.rawPosition.x),
                    y: this.filterY.update(this.rawPosition.y),
                    z: this.filterZ.update(this.rawPosition.z)
                };
                
                // Draw debug visualization
                this.drawDebug(face);
            }
        } catch (error) {
            // Silently handle detection errors
        }
    }

    drawDebug(face) {
        if (!this.debugCtx || !this.debugCanvas) return;
        
        this.debugCtx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
        
        const bbox = face.boundingBox;
        
        // Draw bounding box
        this.debugCtx.strokeStyle = '#00f0ff';
        this.debugCtx.lineWidth = 2;
        this.debugCtx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
        
        // Draw face center
        const centerX = bbox.originX + bbox.width / 2;
        const centerY = bbox.originY + bbox.height / 2;
        
        this.debugCtx.beginPath();
        this.debugCtx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        this.debugCtx.fillStyle = '#00ff88';
        this.debugCtx.fill();
        
        // Draw keypoints if available
        if (face.keypoints) {
            face.keypoints.forEach(kp => {
                this.debugCtx.beginPath();
                this.debugCtx.arc(kp.x * this.debugCanvas.width, kp.y * this.debugCanvas.height, 3, 0, Math.PI * 2);
                this.debugCtx.fillStyle = '#ff3366';
                this.debugCtx.fill();
            });
        }
    }

    getHeadPosition() {
        return { ...this.headPosition };
    }

    getRawPosition() {
        return { ...this.rawPosition };
    }

    setSmoothing(level) {
        this.config.smoothing = level;
        this.filterX.setSmoothing(level);
        this.filterY.setSmoothing(level);
        this.filterZ.setSmoothing(level);
    }

    setMirrored(mirrored) {
        this.config.mirrored = mirrored;
    }

    setUpdateInterval(interval) {
        this.config.updateInterval = interval;
    }

    destroy() {
        this.stop();
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
        if (this.detector) {
            this.detector.close();
        }
    }
}

// Export for module use
export default FaceTracker;
export { FaceTracker, KalmanFilter };
