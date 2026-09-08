import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, TimerReset } from 'lucide-react';

const presets = [45, 60, 90] as const;

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function FocusTimer() {
  const [selectedMinutes, setSelectedMinutes] = useState(45);
  const [customMinutes, setCustomMinutes] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(45 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const endAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const totalSeconds = selectedMinutes * 60;
  const progress = Math.max(0, Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100));

  const prepareAudio = () => {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextConstructor) return;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextConstructor();
    void audioContextRef.current.resume();
  };

  const playFinishedSound = () => {
    const context = audioContextRef.current;
    if (!context) return;
    const start = context.currentTime;
    [0, 0.9, 1.8].forEach((ringDelay) => {
      [
        { frequency: 660, volume: 0.42 },
        { frequency: 1320, volume: 0.2 },
        { frequency: 1980, volume: 0.1 },
      ].forEach(({ frequency, volume }) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start + ringDelay);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.985, start + ringDelay + 0.7);
        gain.gain.setValueAtTime(0.0001, start + ringDelay);
        gain.gain.exponentialRampToValueAtTime(volume, start + ringDelay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + ringDelay + 0.78);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + ringDelay);
        oscillator.stop(start + ringDelay + 0.8);
      });
    });
  };

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      if (!endAtRef.current) return;
      const next = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0) {
        setIsRunning(false);
        setIsComplete(true);
        endAtRef.current = null;
        playFinishedSound();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const choosePreset = (minutes: number) => {
    setSelectedMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setIsRunning(false);
    setIsComplete(false);
    endAtRef.current = null;
  };

  const applyCustomMinutes = () => {
    const minutes = Number(customMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) return;
    choosePreset(minutes);
  };

  const toggleTimer = () => {
    prepareAudio();
    if (isRunning) {
      if (endAtRef.current) {
        setRemainingSeconds(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
      }
      endAtRef.current = null;
      setIsRunning(false);
      return;
    }
    if (remainingSeconds === 0) setRemainingSeconds(totalSeconds);
    endAtRef.current = Date.now() + (remainingSeconds === 0 ? totalSeconds : remainingSeconds) * 1000;
    setIsComplete(false);
    setIsRunning(true);
  };

  const reset = () => {
    setRemainingSeconds(totalSeconds);
    setIsRunning(false);
    setIsComplete(false);
    endAtRef.current = null;
  };

  return (
    <div className="h-full rounded-2xl border border-border bg-background/65 p-3 sm:p-4">
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TimerReset size={18} className="text-accent" />
            <h3 className="text-base font-extrabold">مؤقت التركيز</h3>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">اختار مدة أو اكتب وقتك الخاص.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {presets.map((minutes) => (
              <button key={minutes} type="button" onClick={() => choosePreset(minutes)} data-testid={`button-timer-${minutes}`} className={`h-8 rounded-lg border px-3 text-[11px] font-extrabold transition ${selectedMinutes === minutes ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'}`}>
                {minutes} دقيقة
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input type="number" min={1} max={240} step={1} value={customMinutes} onChange={(event) => setCustomMinutes(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applyCustomMinutes(); }} placeholder="مثلاً 5" aria-label="مدة مخصصة بالدقائق" data-testid="input-custom-timer" className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-xs outline-none focus:border-primary" />
            <button type="button" onClick={applyCustomMinutes} disabled={!Number.isInteger(Number(customMinutes)) || Number(customMinutes) < 1 || Number(customMinutes) > 240} data-testid="button-apply-custom-timer" className="h-8 rounded-lg border border-primary/25 px-3 text-[11px] font-extrabold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40">ضبط</button>
          </div>
        </div>

        <div className={`min-w-0 rounded-xl border p-3 transition ${isComplete ? 'border-secondary bg-secondary/15' : 'border-border bg-card/80'}`}>
          <div className="flex items-center justify-between gap-4" dir="ltr">
            <span data-testid="text-timer" className="font-mono-ui text-3xl font-black tracking-tight text-foreground sm:text-4xl">{formatTime(remainingSeconds)}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleTimer} data-testid="button-toggle-timer" aria-label={isRunning ? 'إيقاف مؤقت' : 'بدء المؤقت'} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90">
                {isRunning ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
              </button>
              <button type="button" onClick={reset} data-testid="button-reset-timer" aria-label="إعادة ضبط المؤقت" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <RotateCcw size={17} />
              </button>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-secondary transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className={`mt-2 text-right text-[11px] font-bold ${isComplete ? 'text-primary' : 'text-muted-foreground'}`}>
            {isComplete ? 'انتهى وقت التركيز — خذ استراحة قصيرة.' : isRunning ? 'جلسة التركيز تعمل الآن' : remainingSeconds < totalSeconds ? 'متوقف مؤقتًا' : 'جاهز للبدء'}
          </p>
        </div>
      </div>
    </div>
  );
}