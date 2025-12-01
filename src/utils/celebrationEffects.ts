import confetti from 'canvas-confetti';

// Sound effects using Web Audio API
const createBeep = (frequency: number, duration: number) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

export const playXPSound = () => {
  createBeep(800, 0.1);
  setTimeout(() => createBeep(1000, 0.1), 100);
};

export const playLevelUpSound = () => {
  createBeep(523, 0.15);
  setTimeout(() => createBeep(659, 0.15), 150);
  setTimeout(() => createBeep(784, 0.15), 300);
  setTimeout(() => createBeep(1047, 0.3), 450);
};

export const playBadgeSound = () => {
  createBeep(660, 0.1);
  setTimeout(() => createBeep(770, 0.1), 100);
  setTimeout(() => createBeep(880, 0.1), 200);
  setTimeout(() => createBeep(1100, 0.2), 300);
};

export const playDailyBonusSound = () => {
  createBeep(440, 0.1);
  setTimeout(() => createBeep(554, 0.1), 100);
  setTimeout(() => createBeep(659, 0.2), 200);
};

// Confetti effects
export const triggerXPConfetti = () => {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF6347']
  });
};

export const triggerLevelUpConfetti = () => {
  const duration = 2000;
  const end = Date.now() + duration;

  const interval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval);
      return;
    }

    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493']
    });

    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493']
    });
  }, 200);
};

export const triggerBadgeConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#9333EA', '#C084FC', '#E879F9', '#F0ABFC']
  });
  
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#9333EA', '#C084FC']
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#9333EA', '#C084FC']
    });
  }, 250);
};

export const triggerDailyBonusConfetti = () => {
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']
  });
};
