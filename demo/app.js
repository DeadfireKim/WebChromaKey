// Web Chroma Key - Standalone Demo
// All-in-one JavaScript implementation

class WebChromaKey {
    constructor() {
        // DOM elements
        this.canvas = document.getElementById('outputCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.cameraSelect = document.getElementById('cameraSelect');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.bgImageInput = document.getElementById('bgImageInput');
        this.uploadBtn = document.getElementById('uploadBtn');

        // State
        this.stream = null;
        this.videoElement = null;
        this.rafId = null;
        this.segmentationModel = null;
        this.isSegmentationActive = false;
        this.isSegmentationReady = false;
        this.backgroundImage = null;
        this.backgroundMode = 'none';
        this.quality = 'medium';
        this.blurStrength = 50;
        this.edgeSmoothing = 10;
        this.maskTightness = 15;

        // FPS tracking
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;

        // Canvas caching
        this.videoCanvas = document.createElement('canvas');  // For capturing video frames
        this.sourceCanvas = document.createElement('canvas'); // For blur source
        this.blurCanvas = document.createElement('canvas');   // For blur output
        this.maskCanvas = document.createElement('canvas');   // For mask processing

        this.init();
    }

    async init() {
        await this.loadCameras();
        this.setupEventListeners();
        this.hideOverlay('loadingOverlay');
    }

    async loadCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput');

            cameras.forEach(camera => {
                const option = document.createElement('option');
                option.value = camera.deviceId;
                option.textContent = camera.label || `카메라 ${cameras.indexOf(camera) + 1}`;
                this.cameraSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load cameras:', error);
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.uploadBtn.addEventListener('click', () => this.bgImageInput.click());
        this.bgImageInput.addEventListener('change', (e) => this.handleImageUpload(e));

        // Quality buttons
        document.querySelectorAll('[data-quality]').forEach(btn => {
            btn.addEventListener('click', () => this.setQuality(btn.dataset.quality));
        });

        // Mode buttons
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => this.setBackgroundMode(btn.dataset.mode));
        });

        // Sliders
        document.getElementById('blurSlider').addEventListener('input', (e) => {
            this.blurStrength = parseInt(e.target.value);
            document.getElementById('blurValue').textContent = this.blurStrength;
        });

        document.getElementById('edgeSlider').addEventListener('input', (e) => {
            this.edgeSmoothing = parseInt(e.target.value);
            document.getElementById('edgeValue').textContent = this.edgeSmoothing;
        });

        document.getElementById('tightnessSlider').addEventListener('input', (e) => {
            this.maskTightness = parseInt(e.target.value);
            document.getElementById('tightnessValue').textContent = this.maskTightness;
        });
    }

    async startCamera() {
        try {
            const deviceId = this.cameraSelect.value;
            const constraints = {
                video: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.stream;
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;

            await this.videoElement.play();

            this.canvas.width = this.videoElement.videoWidth || 640;
            this.canvas.height = this.videoElement.videoHeight || 480;

            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'inline-block';
            this.cameraSelect.disabled = true;
            this.hideOverlay('readyOverlay');
            this.showElement('fpsDisplay');
            this.updateStatus('cameraStatus', true);

            document.getElementById('resolution').textContent =
                `${this.canvas.width}×${this.canvas.height}`;

            this.updateAIResolution();
            this.startRendering();
        } catch (error) {
            console.error('Failed to start camera:', error);
            alert('카메라 접근 실패: ' + error.message);
        }
    }

    stopCamera() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement = null;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.startBtn.style.display = 'inline-block';
        this.stopBtn.style.display = 'none';
        this.cameraSelect.disabled = false;
        this.showOverlay('readyOverlay');
        this.hideElement('fpsDisplay');
        this.updateStatus('cameraStatus', false);
        this.fps = 0;
        document.getElementById('fpsInfo').textContent = '0';
    }

    async setSegmentationActive(active) {
        if (this.isSegmentationActive === active) return;

        this.isSegmentationActive = active;
        this.updateStatus('segmentationStatus', this.isSegmentationActive);

        if (this.isSegmentationActive && !this.isSegmentationReady) {
            this.showOverlay('loadingOverlay');
            await this.initializeSegmentation();
            this.hideOverlay('loadingOverlay');
        }
    }

    async initializeSegmentation() {
        try {
            console.log('Initializing MediaPipe...');

            const SelfieSegmentation = window.SelfieSegmentation;
            if (!SelfieSegmentation) {
                throw new Error('MediaPipe not loaded');
            }

            this.segmentationModel = new SelfieSegmentation({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                }
            });

            this.segmentationModel.setOptions({
                modelSelection: this.quality === 'high' ? 1 : 0,
                selfieMode: false
            });

            this.segmentationModel.onResults((results) => {
                this.handleSegmentationResults(results);
            });

            await this.segmentationModel.initialize();
            this.isSegmentationReady = true;
            console.log('MediaPipe initialized');
        } catch (error) {
            console.error('Failed to initialize segmentation:', error);
            alert('배경 제거 초기화 실패: ' + error.message);
            this.isSegmentationActive = false;
            this.updateStatus('segmentationStatus', false);
        }
    }

    lastMask = null;
    isProcessing = false;

    handleSegmentationResults(results) {
        if (!results.segmentationMask) return;

        const mask = results.segmentationMask;
        const canvas = document.createElement('canvas');

        // Scale mask to target size (for low quality upscaling)
        const targetWidth = this.targetMaskWidth || mask.width;
        const targetHeight = this.targetMaskHeight || mask.height;

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Draw mask scaled to target size
        ctx.drawImage(mask, 0, 0, targetWidth, targetHeight);

        this.lastMask = ctx.getImageData(0, 0, targetWidth, targetHeight);
        this.isProcessing = false;
    }

    async getSegmentationMask(frame) {
        if (!this.isSegmentationReady || !this.segmentationModel) {
            return null;
        }

        if (this.isProcessing && this.lastMask) {
            return this.lastMask;
        }

        this.isProcessing = true;

        // Store target mask size for upscaling
        this.targetMaskWidth = frame.width;
        this.targetMaskHeight = frame.height;

        const tempCanvas = document.createElement('canvas');

        // Scale down for low quality (faster processing)
        const scale = this.quality === 'low' ? 0.5 : 1.0;
        tempCanvas.width = frame.width * scale;
        tempCanvas.height = frame.height * scale;

        const tempCtx = tempCanvas.getContext('2d');

        // Create image bitmap from frame
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = frame.width;
        sourceCanvas.height = frame.height;
        sourceCanvas.getContext('2d').putImageData(frame, 0, 0);

        // Draw scaled version
        tempCtx.drawImage(sourceCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

        await this.segmentationModel.send({ image: tempCanvas });

        // Wait a bit for result
        await new Promise(resolve => setTimeout(resolve, 10));

        return this.lastMask;
    }

    startRendering() {
        const render = async () => {
            if (!this.videoElement || !this.stream) return;

            try {
                // Draw video frame to temp canvas first (avoid race condition)
                const videoCtx = this.videoCanvas.getContext('2d');

                if (this.videoCanvas.width !== this.canvas.width) {
                    this.videoCanvas.width = this.canvas.width;
                    this.videoCanvas.height = this.canvas.height;
                }

                videoCtx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
                let frame = videoCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);

                // Get segmentation mask
                let mask = null;
                if (this.isSegmentationActive && this.isSegmentationReady) {
                    mask = await this.getSegmentationMask(frame);
                }

                // Compose with background
                if (mask && this.backgroundMode !== 'none') {
                    frame = this.composeFrame(frame, mask);
                }

                // Render to canvas
                this.ctx.putImageData(frame, 0, 0);

                // Update FPS
                this.updateFPS();

            } catch (error) {
                console.error('Render error:', error);
            }

            this.rafId = requestAnimationFrame(render);
        };

        render();
    }

    composeFrame(frame, mask) {
        const { width, height } = frame;

        if (this.backgroundMode === 'none' || !mask) {
            return frame;
        }

        // Tighten mask
        let processedMask = this.tightenMask(mask, this.maskTightness / 100);

        // Feather mask
        processedMask = this.featherMask(processedMask, this.edgeSmoothing / 100);

        // Apply background effect
        if (this.backgroundMode === 'blur') {
            return this.applyBlur(frame, processedMask);
        } else if (this.backgroundMode === 'replace' && this.backgroundImage) {
            return this.replaceBackground(frame, processedMask);
        }

        return frame;
    }

    tightenMask(mask, tightness) {
        if (tightness <= 0) return mask;

        const { width, height } = mask;
        const threshold = Math.round(tightness * 200);
        const current = new ImageData(width, height);

        // Apply threshold
        for (let i = 0; i < mask.data.length; i += 4) {
            const value = mask.data[i];
            if (value < threshold) {
                current.data[i] = 0;
                current.data[i + 1] = 0;
                current.data[i + 2] = 0;
            } else {
                const boosted = Math.min(255, ((value - threshold) / (255 - threshold)) * 255);
                current.data[i] = boosted;
                current.data[i + 1] = boosted;
                current.data[i + 2] = boosted;
            }
            current.data[i + 3] = 255;
        }

        // Morphological erosion
        const iterations = Math.max(1, Math.round(tightness * 6));
        let eroded = current;

        for (let iter = 0; iter < iterations; iter++) {
            const temp = new ImageData(width, height);

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    const center = eroded.data[idx];
                    const top = eroded.data[((y - 1) * width + x) * 4];
                    const bottom = eroded.data[((y + 1) * width + x) * 4];
                    const left = eroded.data[(y * width + (x - 1)) * 4];
                    const right = eroded.data[(y * width + (x + 1)) * 4];

                    const min = Math.min(center, top, bottom, left, right);
                    temp.data[idx] = min;
                    temp.data[idx + 1] = min;
                    temp.data[idx + 2] = min;
                    temp.data[idx + 3] = 255;
                }
            }

            eroded = temp;
        }

        return eroded;
    }

    featherMask(mask, strength) {
        if (!this.maskCanvas) {
            this.maskCanvas = document.createElement('canvas');
        }

        const { width, height } = mask;
        this.maskCanvas.width = width;
        this.maskCanvas.height = height;
        const ctx = this.maskCanvas.getContext('2d', { willReadFrequently: true });

        ctx.putImageData(mask, 0, 0);

        const blurAmount = Math.max(1, Math.round(strength * 10));
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.drawImage(this.maskCanvas, 0, 0);
        ctx.filter = 'none';

        return ctx.getImageData(0, 0, width, height);
    }

    applyBlur(frame, mask) {
        const { width, height } = frame;

        // Setup canvases
        if (this.sourceCanvas.width !== width) {
            this.sourceCanvas.width = width;
            this.sourceCanvas.height = height;
            this.blurCanvas.width = width;
            this.blurCanvas.height = height;
        }

        const sourceCtx = this.sourceCanvas.getContext('2d');
        const blurCtx = this.blurCanvas.getContext('2d', { willReadFrequently: true });

        // Draw original frame
        sourceCtx.putImageData(frame, 0, 0);

        // Apply blur
        const blurAmount = Math.max(1, Math.round(this.blurStrength / 5));
        blurCtx.filter = `blur(${blurAmount}px)`;
        blurCtx.drawImage(this.sourceCanvas, 0, 0);
        blurCtx.filter = 'none';

        const blurredFrame = blurCtx.getImageData(0, 0, width, height);

        // Composite
        const output = new ImageData(width, height);
        for (let i = 0; i < frame.data.length; i += 4) {
            const maskValue = mask.data[i] / 255;
            output.data[i] = frame.data[i] * maskValue + blurredFrame.data[i] * (1 - maskValue);
            output.data[i + 1] = frame.data[i + 1] * maskValue + blurredFrame.data[i + 1] * (1 - maskValue);
            output.data[i + 2] = frame.data[i + 2] * maskValue + blurredFrame.data[i + 2] * (1 - maskValue);
            output.data[i + 3] = 255;
        }

        return output;
    }

    replaceBackground(frame, mask) {
        const { width, height } = frame;

        // Draw background image
        this.ctx.save();
        const imgRatio = this.backgroundImage.width / this.backgroundImage.height;
        const canvasRatio = width / height;

        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (imgRatio > canvasRatio) {
            drawHeight = height;
            drawWidth = height * imgRatio;
            offsetX = (width - drawWidth) / 2;
        } else {
            drawWidth = width;
            drawHeight = width / imgRatio;
            offsetY = (height - drawHeight) / 2;
        }

        this.ctx.drawImage(this.backgroundImage, offsetX, offsetY, drawWidth, drawHeight);
        const bgData = this.ctx.getImageData(0, 0, width, height);
        this.ctx.restore();

        // Composite
        const output = new ImageData(width, height);
        for (let i = 0; i < frame.data.length; i += 4) {
            const maskValue = mask.data[i] / 255;
            output.data[i] = frame.data[i] * maskValue + bgData.data[i] * (1 - maskValue);
            output.data[i + 1] = frame.data[i + 1] * maskValue + bgData.data[i + 1] * (1 - maskValue);
            output.data[i + 2] = frame.data[i + 2] * maskValue + bgData.data[i + 2] * (1 - maskValue);
            output.data[i + 3] = 255;
        }

        return output;
    }

    updateFPS() {
        const now = performance.now();
        this.frameCount++;

        if (now - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = now;

            document.getElementById('fpsDisplay').textContent = `FPS: ${this.fps}`;
            document.getElementById('fpsInfo').textContent = this.fps.toString();
        }
    }

    setQuality(quality) {
        this.quality = quality;
        document.querySelectorAll('[data-quality]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.quality === quality);
        });

        if (this.segmentationModel) {
            this.segmentationModel.setOptions({
                modelSelection: quality === 'high' ? 1 : 0
            });
        }

        // Update AI resolution display
        this.updateAIResolution();
    }

    updateAIResolution() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const scale = this.quality === 'low' ? 0.5 : 1.0;
        const aiWidth = Math.round(width * scale);
        const aiHeight = Math.round(height * scale);

        const aiResElement = document.getElementById('aiResolution');
        const qualityElement = document.getElementById('qualityInfo');

        if (aiResElement) {
            aiResElement.textContent = `${aiWidth}×${aiHeight}`;
        }
        if (qualityElement) {
            const qualityNames = { low: '낮음', medium: '중간', high: '높음' };
            qualityElement.textContent = qualityNames[this.quality] || '중간';
        }
    }

    setBackgroundMode(mode) {
        this.backgroundMode = mode;
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Auto enable/disable segmentation based on mode
        const needsSegmentation = mode === 'blur' || mode === 'replace';
        this.setSegmentationActive(needsSegmentation);

        // Show/hide controls
        const showBlur = mode === 'blur';
        const showReplace = mode === 'blur' || mode === 'replace';

        this.toggleElement('blurControl', showBlur);
        this.toggleElement('edgeControl', showReplace);
        this.toggleElement('tightnessControl', showReplace);
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB 이하여야 합니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;

                const preview = document.getElementById('bgPreview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Background">`;
                preview.style.display = 'block';

                if (this.backgroundMode === 'none') {
                    this.setBackgroundMode('replace');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Utility methods
    showOverlay(id) {
        document.getElementById(id).style.display = 'flex';
    }

    hideOverlay(id) {
        document.getElementById(id).style.display = 'none';
    }

    showElement(id) {
        document.getElementById(id).style.display = 'block';
    }

    hideElement(id) {
        document.getElementById(id).style.display = 'none';
    }

    toggleElement(id, show) {
        document.getElementById(id).style.display = show ? 'block' : 'none';
    }

    updateStatus(id, active) {
        const element = document.getElementById(id);
        element.classList.toggle('active', active);
        element.textContent = (active ? '● ' : '○ ') +
            (id === 'cameraStatus' ? '카메라' : '배경제거');
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new WebChromaKey();
    });
} else {
    window.app = new WebChromaKey();
}
