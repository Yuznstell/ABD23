# 3D Parallax Cyber Room

An immersive "window into a 3D cyber-room" web application with real-time face tracking for parallax effects and hand gesture recognition to control video playback.

## Features

### 🎯 Dual Tracking System
- **Face Tracking**: MediaPipe Face Detection with Kalman filtering for smooth head position tracking
- **Hand Gestures**: Real-time gesture recognition with configurable cooldown system

### 🎮 Gesture Controls
| Gesture | Default Action |
|---------|---------------|
| 👍 Thumbs Up | Play Video |
| ✋ Open Palm | Pause Video |

### 🖥️ 3D Environment
- Neon wireframe cyber-room using Three.js
- Video screen on back wall with VideoTexture
- Floating atmospheric particles
- Parallax camera movement based on head position
- Fog effect for depth

### ⚙️ Control Panel
- Parallax Intensity slider
- Smoothing adjustment
- Grid Detail customization
- Performance Mode toggle
- Debug Mode (shows webcam with tracking overlay)
- Real-time FPS counter

## Getting Started

### Requirements
- Modern web browser (Chrome, Edge, Firefox)
- Webcam for face/hand tracking
- Local web server (HTTPS or localhost required for MediaPipe)


## License

MIT License - Feel free to use and modify!

## Credits

Built with Three.js and MediaPipe
