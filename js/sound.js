// sound.js - Professional Sound System & Haptic Feedback

const SoundSystem = {
    audioCtx: null,
    isSoundEnabled: true,
    isHapticEnabled: true,

    init() {
        // Load preferences
        this.isSoundEnabled = localStorage.getItem('pms_sound_enabled') !== 'false';
        this.isHapticEnabled = localStorage.getItem('pms_haptic_enabled') !== 'false';
    },

    getAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioCtx;
    },

    playTone(freq, type, duration, vol) {
        if (!this.isSoundEnabled) return;

        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            const t = ctx.currentTime + 0.01; // slight offset to prevent glitches
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);

            // Envelope
            gainNode.gain.setValueAtTime(vol, t);
            gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(t);
            osc.stop(t + duration);
        } catch (e) {
            console.warn("Audio play failed:", e);
        }
    },

    playTrash() {
        if (!this.isSoundEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            const t = ctx.currentTime + 0.01;
            const bufferSize = ctx.sampleRate * 0.25; // 250ms of noise
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            // Lowpass filter for the "crumple/trash" feel
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, t);
            filter.frequency.exponentialRampToValueAtTime(100, t + 0.25);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(1.5, t); // Boost volume
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(t);
        } catch (e) {
            console.warn("Trash audio failed:", e);
        }
    },

    playClick() {
        this.playTone(400, 'sine', 0.1, 0.5); // increased volume
    },

    playSuccess() {
        this.playTone(600, 'sine', 0.1, 0.5); // increased volume
        setTimeout(() => this.playTone(800, 'sine', 0.15, 0.5), 100);
    },

    playError() {
        this.playTone(200, 'sawtooth', 0.3, 0.6); // increased volume
    },

    vibrate(pattern) {
        if (!this.isHapticEnabled) return;
        if (navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                // Ignore if not supported
            }
        }
    },

    toggleSound(enabled) {
        this.isSoundEnabled = enabled;
        localStorage.setItem('pms_sound_enabled', enabled);
        if (enabled) this.playSuccess();
    },

    toggleHaptic(enabled) {
        this.isHapticEnabled = enabled;
        localStorage.setItem('pms_haptic_enabled', enabled);
        if (enabled) this.vibrate([10, 30, 10]);
    }
};

// Initialize on load
SoundSystem.init();

// Global Event Delegation for Sounds & Haptics
document.addEventListener('DOMContentLoaded', () => {
    // Use capture phase to ensure we catch the click before any e.stopPropagation() calls
    document.addEventListener('click', (e) => {
        // Initialize AudioContext on first user interaction
        if (SoundSystem.isSoundEnabled && SoundSystem.audioCtx && SoundSystem.audioCtx.state === 'suspended') {
            SoundSystem.audioCtx.resume();
        }

        const target = e.target.closest('button, .btn, .clickable, .sidebar-nav-item, .card, a');
        if (target) {
            // Check if it's a danger/delete action
            if (target.classList.contains('btn-danger') || 
                target.querySelector('[data-lucide="trash-2"]') || 
                target.getAttribute('id') === 'btn-reset-app' || 
                (target.textContent && target.textContent.toLowerCase().includes('delete'))) {
                SoundSystem.playTrash();
                SoundSystem.vibrate([30, 50, 30]);
            } else if (target.classList.contains('btn-primary') || target.getAttribute('type') === 'submit') {
                SoundSystem.playSuccess();
                SoundSystem.vibrate([10, 30, 10]);
            } else {
                SoundSystem.playClick();
                SoundSystem.vibrate(10);
            }
        }
    }, { capture: true });

    // Hook up Settings UI Toggles if they exist
    const soundToggle = document.getElementById('settings-sound-toggle');
    const hapticToggle = document.getElementById('settings-haptic-toggle');

    if (soundToggle) {
        soundToggle.checked = SoundSystem.isSoundEnabled;
        soundToggle.addEventListener('change', (e) => {
            SoundSystem.toggleSound(e.target.checked);
        });
    }

    if (hapticToggle) {
        hapticToggle.checked = SoundSystem.isHapticEnabled;
        hapticToggle.addEventListener('change', (e) => {
            SoundSystem.toggleHaptic(e.target.checked);
        });
    }
});
