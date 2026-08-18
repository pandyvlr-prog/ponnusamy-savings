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
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    playTone(freq, type, duration, vol) {
        if (!this.isSoundEnabled) return;

        try {
            const ctx = this.getAudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            // Envelope
            gainNode.gain.setValueAtTime(vol, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn("Audio play failed:", e);
        }
    },

    playTrash() {
        if (!this.isSoundEnabled) return;
        try {
            const ctx = this.getAudioContext();
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
            filter.frequency.setValueAtTime(1000, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(1.0, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start();
        } catch (e) {
            console.warn("Trash audio failed:", e);
        }
    },

    playClick() {
        this.playTone(400, 'sine', 0.1, 0.1);
    },

    playSuccess() {
        this.playTone(600, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(800, 'sine', 0.15, 0.1), 100);
    },

    playError() {
        this.playTone(200, 'sawtooth', 0.3, 0.2);
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
    document.body.addEventListener('click', (e) => {
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
    });

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
