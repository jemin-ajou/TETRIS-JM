class AudioManager {
    constructor() {
        this.ctx = null;
        this.sfxMuted = localStorage.getItem('tetris_sfx_muted') === 'true';
        this.masterGain = null;
        this.noiseBuffer = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this._createNoiseBuffer();
        this.updateVolume();
    }

    _createNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    }

    updateVolume() {
        if (!this.masterGain) return;
        this.masterGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.05);
    }

    toggleSFX() {
        this.sfxMuted = !this.sfxMuted;
        localStorage.setItem('tetris_sfx_muted', this.sfxMuted);
        return this.sfxMuted;
    }

    play(type, data = {}) {
        if (!this.ctx || this.sfxMuted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const combo = data.combo || 1;
        const comboBonus = Math.min(1.5, 1 + (combo * 0.1));

        switch (type) {
            case 'move':
                this._osc(now, 'square', 1000, 800, 0.08, 0.02);
                break;
            case 'rotate':
                this._osc(now, 'sine', 1500, 1800, 0.08, 0.03);
                break;
            case 'land':
                this._osc(now, 'triangle', 250, 60, 0.3, 0.08);
                this._noise(now, 0.2, 0.05);
                break;
            case 'harddrop':
                this._osc(now, 'sawtooth', 150, 30, 0.6, 0.2);
                this._noise(now, 0.5, 0.15);
                break;
            case 'clear':
                this._osc(now, 'square', 500, 1200 * comboBonus, 0.4 * comboBonus, 0.25 * comboBonus);
                this._noise(now, 0.6 * comboBonus, 0.2 * comboBonus);
                break;
            case 'tetris':
                [1, 1.25, 1.5, 2].forEach((m, i) => {
                    this._osc(now + i * 0.06, 'square', 400 * m, 800 * m, 0.4, 0.35);
                    this._noise(now + i * 0.06, 0.7, 0.3);
                });
                break;
            case 'gameover':
                this._osc(now, 'sawtooth', 500, 30, 0.5, 1.5);
                this._noise(now, 0.6, 1.0);
                break;
            case 'combo':
                // Removed combo voice based on user feedback
                break;
            case 'pause':
                this._playStatusSound(true);
                break;
            case 'resume':
                this._playStatusSound(false);
                break;
        }
    }

    _playStatusSound(isPause) {
        if (this.sfxMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const freq = isPause ? 880 : 440;
        const endFreq = isPause ? 440 : 880;
        
        this._osc(now, 'sine', freq, endFreq, 0.1, 0.1);
    }

    _osc(start, type, freqStart, freqEnd, vol, dur) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.frequency.setValueAtTime(freqStart, start);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
        
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        
        osc.start(start);
        osc.stop(start + dur);
    }

    _noise(start, vol, dur) {
        if (!this.ctx || !this.noiseBuffer) return;
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = this.noiseBuffer;
        source.connect(gain);
        gain.connect(this.masterGain);

        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        source.start(start);
        source.stop(start + dur);
    }
}

// Global instance
const audioManager = new AudioManager();
