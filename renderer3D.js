/**
 * 3D Renderer Module
 * Three.js scene with cyber-room, video texture, and parallax camera
 */

class Renderer3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;

        // Room elements
        this.room = null;
        this.videoScreen = null;
        this.videoTexture = null;
        this.particles = null;

        // Video element
        this.video = null;
        this.isVideoPlaying = false;

        // Camera settings
        this.cameraBasePosition = { x: 0, y: 0, z: 5 };
        this.cameraTarget = { x: 0, y: 0, z: 5 };
        this.parallaxIntensity = 0.5;
        this.lerpFactor = 0.08;

        // Room settings
        this.roomSize = { width: 16, height: 9, depth: 12 };
        this.gridDetail = 20;

        // Performance mode
        this.performanceMode = false;
        this.particleCount = 500;

        // Animation
        this.clock = null;
    }

    init() {
        this.container = document.getElementById('canvas-container');

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);

        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x0a0a0f, 5, 20);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(
            this.cameraBasePosition.x,
            this.cameraBasePosition.y,
            this.cameraBasePosition.z
        );

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Create room
        this.createRoom();

        // Create video screen
        this.createVideoScreen();

        // Create particles
        this.createParticles();

        // Clock for animations
        this.clock = new THREE.Clock();

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        console.log('3D Renderer initialized');
    }

    createRoom() {
        const { width, height, depth } = this.roomSize;

        // Neon wireframe material
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.6
        });

        const secondaryMaterial = new THREE.LineBasicMaterial({
            color: 0x0066ff,
            transparent: true,
            opacity: 0.3
        });

        this.room = new THREE.Group();

        // Create grid lines for each wall
        // Back wall frame
        const backWallFrame = this.createWireframeRect(width, height);
        backWallFrame.position.z = -depth / 2;
        this.room.add(backWallFrame);

        // Floor grid
        const floorGrid = this.createGrid(width, depth, this.gridDetail);
        floorGrid.rotation.x = -Math.PI / 2;
        floorGrid.position.y = -height / 2;
        this.room.add(floorGrid);

        // Ceiling grid  
        const ceilingGrid = this.createGrid(width, depth, this.gridDetail);
        ceilingGrid.rotation.x = Math.PI / 2;
        ceilingGrid.position.y = height / 2;
        this.room.add(ceilingGrid);

        // Left wall grid
        const leftWallGrid = this.createGrid(depth, height, Math.floor(this.gridDetail / 2));
        leftWallGrid.rotation.y = Math.PI / 2;
        leftWallGrid.position.x = -width / 2;
        this.room.add(leftWallGrid);

        // Right wall grid
        const rightWallGrid = this.createGrid(depth, height, Math.floor(this.gridDetail / 2));
        rightWallGrid.rotation.y = -Math.PI / 2;
        rightWallGrid.position.x = width / 2;
        this.room.add(rightWallGrid);

        // Add corner edges
        this.addCornerEdges();

        this.scene.add(this.room);
    }

    createWireframeRect(width, height) {
        const geometry = new THREE.BufferGeometry();
        const hw = width / 2;
        const hh = height / 2;

        const vertices = new Float32Array([
            -hw, -hh, 0, hw, -hh, 0,
            hw, -hh, 0, hw, hh, 0,
            hw, hh, 0, -hw, hh, 0,
            -hw, hh, 0, -hw, -hh, 0
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.8
        });

        return new THREE.LineSegments(geometry, material);
    }

    createGrid(width, height, divisions) {
        const group = new THREE.Group();

        const step = width / divisions;
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        // Vertical lines
        for (let i = 0; i <= divisions; i++) {
            const x = -halfWidth + i * step;
            vertices.push(x, -halfHeight, 0, x, halfHeight, 0);
        }

        // Horizontal lines
        const hStep = height / divisions;
        for (let i = 0; i <= divisions; i++) {
            const y = -halfHeight + i * hStep;
            vertices.push(-halfWidth, y, 0, halfWidth, y, 0);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.2
        });

        group.add(new THREE.LineSegments(geometry, material));

        return group;
    }

    addCornerEdges() {
        const { width, height, depth } = this.roomSize;
        const hw = width / 2;
        const hh = height / 2;
        const hd = depth / 2;

        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            // Front-to-back edges
            -hw, -hh, hd, -hw, -hh, -hd,  // Bottom-left
            hw, -hh, hd, hw, -hh, -hd,   // Bottom-right
            -hw, hh, hd, -hw, hh, -hd,   // Top-left
            hw, hh, hd, hw, hh, -hd,    // Top-right
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.7
        });

        this.room.add(new THREE.LineSegments(geometry, material));
    }

    createVideoScreen() {
        // Get video element
        this.video = document.getElementById('mainVideo');

        // Explicitly set video source to ensure it's loaded
        const videoSource = this.video.querySelector('source');
        if (videoSource) {
            // Set src attribute directly on video element as fallback
            this.video.src = videoSource.src;
        }

        // Add video event listeners for debugging
        this.video.addEventListener('loadeddata', () => {
            console.log('Video loaded successfully');
        });

        this.video.addEventListener('error', (e) => {
            console.error('Video error:', this.video.error);
            // Try fallback to original video if converted fails
            if (this.video.src.includes('video_converted')) {
                console.log('Trying fallback to original video...');
                this.video.src = 'assets/video.mp4';
                this.video.load();
            }
        });

        this.video.addEventListener('canplay', () => {
            console.log('Video can play');
        });

        // Force load video
        this.video.load();

        // Create video texture
        this.videoTexture = new THREE.VideoTexture(this.video);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.videoTexture.format = THREE.RGBFormat;

        // Screen size (16:9 aspect ratio, smaller than back wall)
        const screenWidth = this.roomSize.width * 0.7;
        const screenHeight = screenWidth * (9 / 16);

        // Create screen geometry
        const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight);

        // Create materials for screen
        const screenMaterial = new THREE.MeshBasicMaterial({
            map: this.videoTexture,
            side: THREE.DoubleSide
        });

        // Create screen mesh
        this.videoScreen = new THREE.Mesh(screenGeometry, screenMaterial);
        this.videoScreen.position.z = -this.roomSize.depth / 2 + 0.1;
        this.videoScreen.position.y = 0.5;

        // Add glow frame around screen
        this.addScreenFrame(screenWidth, screenHeight);

        this.scene.add(this.videoScreen);
    }

    addScreenFrame(width, height) {
        const frameGeometry = new THREE.BufferGeometry();
        const hw = width / 2 + 0.1;
        const hh = height / 2 + 0.1;

        const vertices = new Float32Array([
            -hw, -hh, 0, hw, -hh, 0,
            hw, -hh, 0, hw, hh, 0,
            hw, hh, 0, -hw, hh, 0,
            -hw, hh, 0, -hw, -hh, 0
        ]);

        frameGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const frameMaterial = new THREE.LineBasicMaterial({
            color: 0x9d00ff,
            transparent: true,
            opacity: 0.9
        });

        const frame = new THREE.LineSegments(frameGeometry, frameMaterial);
        frame.position.z = -this.roomSize.depth / 2 + 0.15;
        frame.position.y = 0.5;

        this.scene.add(frame);
    }

    createParticles() {
        const count = this.performanceMode ? 100 : this.particleCount;
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const { width, height, depth } = this.roomSize;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Random position within room
            positions[i3] = (Math.random() - 0.5) * width * 0.9;
            positions[i3 + 1] = (Math.random() - 0.5) * height * 0.9;
            positions[i3 + 2] = (Math.random() - 0.5) * depth;

            // Random cyan/blue colors
            const t = Math.random();
            colors[i3] = t * 0.1;
            colors[i3 + 1] = 0.5 + t * 0.5;
            colors[i3 + 2] = 1;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    updateParticles() {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        const time = this.clock.getElapsedTime();

        for (let i = 0; i < positions.length; i += 3) {
            // Gentle floating motion
            positions[i + 1] += Math.sin(time + positions[i] * 0.5) * 0.002;

            // Wrap around if outside room
            if (positions[i + 1] > this.roomSize.height / 2) {
                positions[i + 1] = -this.roomSize.height / 2;
            }
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    updateCamera(headPosition) {
        if (!headPosition) return;

        // Calculate target position based on head position
        // Invert for "window" effect - look left, camera moves right
        this.cameraTarget.x = this.cameraBasePosition.x - headPosition.x * this.parallaxIntensity * 3;
        this.cameraTarget.y = this.cameraBasePosition.y - headPosition.y * this.parallaxIntensity * 2;
        this.cameraTarget.z = this.cameraBasePosition.z + headPosition.z * this.parallaxIntensity;

        // Lerp camera position for smooth movement
        this.camera.position.x += (this.cameraTarget.x - this.camera.position.x) * this.lerpFactor;
        this.camera.position.y += (this.cameraTarget.y - this.camera.position.y) * this.lerpFactor;
        this.camera.position.z += (this.cameraTarget.z - this.camera.position.z) * this.lerpFactor;

        // Look at center of room (slightly behind center for depth)
        this.camera.lookAt(0, 0, -2);
    }

    playVideo() {
        if (this.video) {
            // Ensure video is loaded
            if (this.video.readyState < 2) {
                this.video.load();
            }

            // Force play with user gesture simulation
            const playPromise = this.video.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this.isVideoPlaying = true;
                        this.video.muted = false; // Try to unmute after play
                        console.log('Video playing');
                    })
                    .catch(err => {
                        console.warn('Video play failed, trying muted:', err);
                        // Try playing muted first (browser allows this)
                        this.video.muted = true;
                        this.video.play()
                            .then(() => {
                                this.isVideoPlaying = true;
                                console.log('Video playing (muted)');
                            })
                            .catch(e => console.error('Video play failed completely:', e));
                    });
            }
        }
    }

    pauseVideo() {
        if (this.video && this.isVideoPlaying) {
            this.video.pause();
            this.isVideoPlaying = false;
            console.log('Video paused');
        }
    }

    toggleVideo() {
        if (this.isVideoPlaying) {
            this.pauseVideo();
        } else {
            this.playVideo();
        }
    }

    setVideoSource(src) {
        if (this.video) {
            this.video.src = src;
            this.video.load();
        }
    }

    unmuteVideo() {
        if (this.video) {
            this.video.muted = false;
        }
    }

    render() {
        // Update particles
        this.updateParticles();

        // Update video texture
        if (this.videoTexture) {
            this.videoTexture.needsUpdate = true;
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    // Configuration methods
    setParallaxIntensity(value) {
        // value: 0-100
        this.parallaxIntensity = value / 100;
    }

    setSmoothing(value) {
        // value: 0-100, higher = smoother (slower)
        this.lerpFactor = 0.02 + (100 - value) / 100 * 0.15;
    }

    setGridDetail(value) {
        this.gridDetail = value;
        // Would need to recreate room to apply
    }

    setPerformanceMode(enabled) {
        this.performanceMode = enabled;

        // Recreate particles with new count
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        this.createParticles();
    }

    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.container && this.renderer) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

// Export for module use
export default Renderer3D;
export { Renderer3D };
