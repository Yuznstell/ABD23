# 3D Parallax Cyber Room

An immersive "window into a 3D cyber-room" web application with real-time face tracking for parallax effects and hand gesture recognition to control video playback.

![Cyber Room Preview](assets/preview.png)

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

### 🔧 Hidden Admin Panel
Access with **Ctrl + Shift + H**

- Gesture threshold sensitivity adjustments
- Cooldown timing configuration
- Action mapping customization (swap gesture functions)
- Custom video source URL
- Save/Reset configuration to localStorage

## Getting Started

### Requirements
- Modern web browser (Chrome, Edge, Firefox)
- Webcam for face/hand tracking
- Local web server (HTTPS or localhost required for MediaPipe)

### Quick Start

1. **Clone or download** the project

2. **Add a video file** (optional):
   ```
   assets/cyberloop.mp4
   ```

3. **Serve locally** using one of these methods:

   Using Node.js:
   ```bash
   npx serve .
   ```

   Using Python:
   ```bash
   python -m http.server 8000
   ```

   Using VS Code: Install "Live Server" extension and click "Go Live"

4. **Open in browser**: Navigate to `http://localhost:3026` (or your server port)

5. **Grant webcam permissions** when prompted

## File Structure

```
├── index.html        # Main HTML structure
├── style.css         # Glassmorphism UI styling
├── app.js            # Main application controller
├── faceTracker.js    # Face detection & Kalman filtering
├── handGesture.js    # Hand tracking & gesture classification
├── renderer3D.js     # Three.js scene & video texture
├── adminSystem.js    # Hidden admin panel & localStorage
├── assets/
│   └── cyberloop.mp4 # Video file (add your own)
└── README.md         # This file
```

## Usage

### Basic Controls

1. **Move your head** left/right/up/down to experience the parallax effect
2. **Show gestures** to the camera:
   - 👍 **Thumbs Up** → Play video
   - ✋ **Open Palm** → Pause video

### UI Controls

| Control | Function |
|---------|----------|
| Parallax Intensity | Adjust camera movement range |
| Smoothing | Control movement smoothness (higher = smoother) |
| Grid Detail | Adjust wireframe grid density |
| Performance Mode | Reduce particles for better FPS |
| Debug Mode | Show webcam feed with tracking overlay |

### Admin Panel

1. Press **Ctrl + Shift + H** to open
2. Adjust gesture sensitivity thresholds
3. Change gesture cooldown timing
4. Swap action mappings
5. Enter custom video URL
6. Click **Save Config** to persist settings
7. Click **Reset to Default** to restore defaults

## Technical Details

### Dependencies (loaded via CDN)
- [Three.js](https://threejs.org/) v0.160.0 - 3D rendering
- [MediaPipe Tasks Vision](https://developers.google.com/mediapipe) v0.10.8 - Face & Hand tracking

### Browser Support
- ✅ Chrome (recommended)
- ✅ Edge
- ✅ Firefox
- ⚠️ Safari (limited WebGL)

### Performance Tips
- Enable **Performance Mode** on slower devices
- Reduce **Grid Detail** for better FPS
- Close other camera-using applications
- Use Chrome for best WebGL performance

## Customization

### Adding Your Own Video

1. Place your video in the `assets/` folder
2. Update the video source in `index.html`:
   ```html
   <source src="assets/your-video.mp4" type="video/mp4">
   ```
   
   Or use the Admin Panel to set a new URL.

### Adjusting Room Size

Edit `renderer3D.js`:
```javascript
this.roomSize = { width: 16, height: 9, depth: 12 };
```

### Changing Colors

Edit CSS variables in `style.css`:
```css
:root {
    --primary-cyan: #00f0ff;
    --secondary-blue: #0066ff;
    --accent-purple: #9d00ff;
}
```

## License

MIT License - Feel free to use and modify!

## Credits

Built with Three.js and MediaPipe
