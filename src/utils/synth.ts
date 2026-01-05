class AudioEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isMuted: boolean = true;

    private init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.setMute(this.isMuted);
    }

    public setMute(muted: boolean) {
        this.isMuted = muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.4, this.ctx!.currentTime, 0.05);
        }
    }

    private createOscillator(freq: number, type: OscillatorType = 'sine'): OscillatorNode {
        this.init();
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
        osc.connect(gain);
        gain.connect(this.masterGain!);

        return osc;
    }

    public playClick() {
        if (this.isMuted) return;
        this.init();
        const osc = this.createOscillator(800, 'sine');
        const gain = this.ctx!.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.frequency.exponentialRampToValueAtTime(400, this.ctx!.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.1);

        osc.start();
        osc.stop(this.ctx!.currentTime + 0.1);
    }

    public playScanStart() {
        if (this.isMuted) return;
        this.init();
        const osc = this.createOscillator(100, 'sawtooth');
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.frequency.exponentialRampToValueAtTime(800, this.ctx!.currentTime + 1);
        gain.gain.setValueAtTime(0.05, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 1);

        osc.start();
        osc.stop(this.ctx!.currentTime + 1);
    }

    public playDataFound() {
        if (this.isMuted) return;
        this.init();
        [1200, 1600, 2000].forEach((freq, i) => {
            const osc = this.createOscillator(freq, 'square');
            const gain = this.ctx!.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain!);

            gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.05);
            gain.gain.setValueAtTime(0.03, this.ctx!.currentTime + i * 0.05 + 0.01);
            gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + i * 0.05 + 0.05);

            osc.start(this.ctx!.currentTime + i * 0.05);
            osc.stop(this.ctx!.currentTime + i * 0.05 + 0.05);
        });
    }

    public playAction() {
        if (this.isMuted) return;
        this.init();
        const osc = this.createOscillator(60, 'triangle');
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.frequency.exponentialRampToValueAtTime(30, this.ctx!.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.5);

        osc.start();
        osc.stop(this.ctx!.currentTime + 0.5);
    }

    public playAlert() {
        if (this.isMuted) return;
        this.init();
        const bufferSize = this.ctx!.sampleRate * 0.2;
        const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx!.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx!.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx!.currentTime + 0.2);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        noise.start();
    }
}

export const soundEngine = new AudioEngine();
