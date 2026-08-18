// sound.js - Premium Sample-Based Audio Engine

const SoundSystem = {
    audioCtx: null,
    isSoundEnabled: true,
    isHapticEnabled: true,
    buffers: {},
    
    // Premium UI Sounds from CDNJS (ion-sound library)
    soundUrls: {
        nav: 'https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/tap.mp3',
        tick: 'https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/button_tiny.mp3',
        untick: 'https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/button_click.mp3',
        detail: 'https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/glass.mp3',
        payout: 'https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/bell_ring.mp3'
    },

    init() {
        this.isSoundEnabled = localStorage.getItem('pms_sound_enabled') !== 'false';
        this.isHapticEnabled = localStorage.getItem('pms_haptic_enabled') !== 'false';
    },

    getAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.preloadSounds();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    async preloadSounds() {
        for (const [key, url] of Object.entries(this.soundUrls)) {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                this.audioCtx.decodeAudioData(arrayBuffer, (decodedData) => {
                    this.buffers[key] = decodedData;
                });
            } catch (e) {
                console.warn(`Failed to load sound: ${key}`, e);
            }
        }
    },

    playSound(key, volume = 1.0) {
        if (!this.isSoundEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();
            
            const buffer = this.buffers[key];
            if (!buffer) return; // Sound not loaded yet

            const source = ctx.createBufferSource();
            source.buffer = buffer;

            const gainNode = ctx.createGain();
            gainNode.gain.value = volume;

            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            source.start(0);
        } catch (e) {
            console.warn("Audio play failed:", e);
        }
    },

    // Specific Action Methods
    playNav() {
        this.playSound('nav', 0.5);
    },
    playMarkPaid() {
        this.playSound('tick', 0.8);
    },
    playUntick() {
        this.playSound('untick', 0.8);
    },
    playOpenDetail() {
        this.playSound('detail', 0.6);
    },
    playPayout() {
        this.playSound('payout', 0.7);
    },

    vibrate(pattern) {
        if (!this.isHapticEnabled) return;
        if (navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) {}
        }
    },

    toggleSound(enabled) {
        this.isSoundEnabled = enabled;
        localStorage.setItem('pms_sound_enabled', enabled);
        if (enabled) {
            this.getAudioContext();
            setTimeout(() => this.playMarkPaid(), 100);
        }
    },

    toggleHaptic(enabled) {
        this.isHapticEnabled = enabled;
        localStorage.setItem('pms_haptic_enabled', enabled);
        if (enabled) this.vibrate([10, 30, 10]);
    }
};

SoundSystem.init();

// Global listeners for generic buttons and specific classes
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        if (SoundSystem.isSoundEnabled && SoundSystem.audioCtx && SoundSystem.audioCtx.state === 'suspended') {
            SoundSystem.audioCtx.resume();
        } else if (SoundSystem.isSoundEnabled && !SoundSystem.audioCtx) {
            SoundSystem.getAudioContext();
        }

        const target = e.target.closest('button, .btn, .clickable, .sidebar-nav-item, .card, a, .member-card, .row-checkbox-wrapper');
        if (!target) return;

        const id = target.id;

        // Route sounds based on exact element classes/IDs
        if (id === 'btn-select-cash' || id === 'btn-select-gpay' || id === 'btn-modal-mark-all') {
            SoundSystem.playMarkPaid();
            SoundSystem.vibrate([10, 30, 10]);
        } else if (id === 'btn-action-unmark-payment' || id === 'btn-modal-unmark-all') {
            SoundSystem.playUntick();
            SoundSystem.vibrate([30, 50, 30]);
        } else if (target.classList.contains('sidebar-nav-item')) {
            SoundSystem.playNav();
            SoundSystem.vibrate(10);
        } else if (target.classList.contains('member-card')) {
            SoundSystem.playOpenDetail();
            SoundSystem.vibrate(10);
        } else if (target.classList.contains('payout-claim-btn') || id === 'btn-save-payout') {
            // Usually form submit handles save, but we can catch the button too
        } else if (target.classList.contains('btn-danger') || target.querySelector('[data-lucide="trash-2"]')) {
            SoundSystem.playUntick();
            SoundSystem.vibrate([30, 50, 30]);
        } else if (target.getAttribute('type') === 'submit' && target.closest('#payout-claim-form')) {
            SoundSystem.playPayout();
            SoundSystem.vibrate([20, 30, 20]);
        } else if (target.getAttribute('type') === 'submit' || target.classList.contains('btn-primary')) {
            SoundSystem.playMarkPaid();
            SoundSystem.vibrate(10);
        } else {
            // Fallback for normal buttons and opening modals
            SoundSystem.playNav();
            SoundSystem.vibrate(5);
        }
    }, { capture: true });

    // Settings
    const soundToggle = document.getElementById('settings-sound-toggle');
    if (soundToggle) {
        soundToggle.checked = SoundSystem.isSoundEnabled;
        soundToggle.addEventListener('change', (e) => SoundSystem.toggleSound(e.target.checked));
    }
    const hapticToggle = document.getElementById('settings-haptic-toggle');
    if (hapticToggle) {
        hapticToggle.checked = SoundSystem.isHapticEnabled;
        hapticToggle.addEventListener('change', (e) => SoundSystem.toggleHaptic(e.target.checked));
    }
});
