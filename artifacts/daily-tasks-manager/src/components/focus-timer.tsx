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
    [0, 0.32, 0.64].forEach((delay, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = index === 2 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(0.22, start + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start + delay);
      oscillator.stop(start + delay + 0.26);
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
    <section className="animate-rise mb-8 overflow-hidden rounded-3xl border border-card-border bg-card/70 p-4 shadow-sm sm:p-5" style={{ animationDelay: '40ms' }}>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <TimerReset size={20} className="text-accent" />
            <h2 className="text-xl font-extrabold">مؤقت التركيز</h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">اختار مدة، ابدأ التركيز، وهننبهك بصوت عند انتهاء الوقت.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {presets.map((minutes) => (
              <button key={minutes} type="button" onClick={() => choosePreset(minutes)} data-testid={`button-timer-${minutes}`} className={`h-9 rounded-xl border px-4 text-xs font-extrabold transition ${selectedMinutes === minutes ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary'}`}>
                {minutes} دقيقة
              </button>
            ))}
          </div>
        </div>

        <div className={`min-w-0 rounded-2xl border p-4 transition sm:min-w-[330px] ${isComplete ? 'border-secondary bg-secondary/15' : 'border-border bg-background/75'}`}>
          <div className="flex items-center justify-between gap-4" dir="ltr">
            <span data-testid="text-timer" className="font-mono-ui text-4xl font-black tracking-tight text-foreground sm:text-5xl">{formatTime(remainingSeconds)}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleTimer} data-testid="button-toggle-timer" aria-label={isRunning ? 'إيقاف مؤقت' : 'بدء المؤقت'} className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90">
                {isRunning ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
              </button>
              <button type="button" onClick={reset} data-testid="button-reset-timer" aria-label="إعادة ضبط المؤقت" className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground">
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
    </section>
  );
}