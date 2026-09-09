const fades = new WeakMap<HTMLMediaElement, () => void>();

export function cancelFade(audio: HTMLMediaElement) {
  fades.get(audio)?.();
}

export function fadeVolume(audio: HTMLMediaElement, target: number, durationMs: number, pauseAtEnd = false, onComplete?: () => void): Promise<boolean> {
  cancelFade(audio);
  const volume = Math.min(1, Math.max(0, Number(target) || 0));
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const start = audio.volume;
  return new Promise((resolve) => {
    let elapsed = 0;
    let timer: ReturnType<typeof setInterval>;
    const finish = (completed: boolean) => {
      clearInterval(timer);
      fades.delete(audio);
      resolve(completed);
    };
    fades.set(audio, () => finish(false));
    const tick = () => {
      elapsed += 50;
      const progress = duration === 0 ? 1 : Math.min(1, elapsed / duration);
      audio.volume = start + (volume - start) * progress;
      if (progress === 1) {
        if (pauseAtEnd) audio.pause();
        onComplete?.();
        finish(true);
      }
    };
    if (duration === 0 || start === volume) {
      elapsed = duration;
      tick();
    } else timer = setInterval(tick, 50);
  });
}
