// Web Audio API Synth Sounds
// Requires user interaction (button click) before calling in modern browsers.

export type SoundEffect = 'success' | 'error' | 'click' | 'whoosh';

let audioCtx: AudioContext | null = null;

function getContext() {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1, delay = 0) {
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
}

export function playSystemSound(effect: SoundEffect) {
    try {
        if (effect === 'success') {
            // Cheerful double chime (Punch-in / Check-in)
            playTone(440, 'sine', 0.2, 0.1, 0);       // A4
            playTone(554.37, 'sine', 0.4, 0.1, 0.15); // C#5
        } else if (effect === 'error') {
            // Low dissonant buzz (Failed action)
            playTone(150, 'sawtooth', 0.3, 0.1, 0);
            playTone(180, 'sawtooth', 0.3, 0.1, 0);
        } else if (effect === 'click') {
            // Short pop
            playTone(800, 'triangle', 0.05, 0.05, 0);
        } else if (effect === 'whoosh') {
            // Quick ascending sweep (Paper airplane)
            const ctx = getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        }
    } catch {
        // Ignore audio errors (e.g. strict autoplay policies)
    }
}
