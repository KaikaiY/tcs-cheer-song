export function playStudioJingle(signal: AbortSignal, onFade: () => void): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  const audio = new Audio("/sounds/studio-opening.wav");
  return new Promise((resolve) => {
    const checkFade = () => {
      if (Number.isFinite(audio.duration) && audio.duration - audio.currentTime <= 0.45) onFade();
    };
    const finish = () => {
      window.clearTimeout(deadline);
      window.clearInterval(fadeCheck);
      signal.removeEventListener("abort", finish);
      audio.removeEventListener("ended", finish);
      audio.removeEventListener("error", finish);
      audio.pause();
      resolve();
    };
    const deadline = window.setTimeout(finish, 7500);
    const fadeCheck = window.setInterval(checkFade, 50);
    signal.addEventListener("abort", finish, { once: true });
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    void audio.play().catch(finish);
  });
}
