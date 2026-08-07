const helper: Record<string, any> = {
  shortTime(time) {
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    if (isNaN(time)) {
      const [h, m, s] = time.split(":").map(Number);
      hours = h;
      minutes = m;
      seconds = s;
    } else {
      hours = Math.floor(time / 3600);
      minutes = Math.floor((time % 3600) / 60);
      seconds = time % 60;
    }

    minutes += hours * 60;
    return `${minutes}:${String(Math.floor(seconds)).padStart(2, "0")}`;
  },

  toNumber(time) {
    if (!time) return 0;
    const parts = time.toString().split(":").map(Number);

    if (parts.length === 2) {
      const minutes = parts[0] || 0;
      const seconds = parts[1] || 0;
      return minutes * 60 + seconds;
    }

    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;

    return hours * 3600 + minutes * 60 + seconds;
  },
};

export default helper;
