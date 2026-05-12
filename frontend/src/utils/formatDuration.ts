export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mm = Math.floor(total / 60).toString().padStart(2, "0");
  const ss = (total % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}




