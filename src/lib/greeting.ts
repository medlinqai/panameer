/**
 * "Good morning, {name}" — the header greeting (MASTER WS10, element 2).
 *
 * Computed CLIENT-SIDE from the viewer's own clock. Rendering it on the server
 * would greet a provider in Sydney with the server's idea of morning, and the
 * one thing a time-aware greeting must get right is the time.
 */
export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
