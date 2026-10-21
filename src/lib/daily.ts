// DB-E009: Panameer-generated video rooms (Daily.co prebuilt). Without DAILY_API_KEY every call returns null
// and the UI says "Video link not set up yet".
const API = "https://api.daily.co/v1";
const key = () => process.env.DAILY_API_KEY?.trim() || null;
export const dailyConfigured = () => !!key();

async function call<T>(path: string, body: object): Promise<T | null> {
  const k = key();
  if (!k) return null;
  const r = await fetch(`${API}${path}`, { method: "POST", headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  if (!r?.ok) { console.error("[daily]", path, r?.status, await r?.text().catch(() => "")); return null; }
  return (await r.json()) as T;
}

/** A private room that expires at `expiresAt`. */
export async function createRoom(name: string, expiresAt: Date) {
  const exp = Math.floor(expiresAt.getTime() / 1000);
  return call<{ name: string; url: string }>("/rooms", { name, privacy: "private", properties: { exp, eject_at_room_exp: true, enable_prejoin_ui: true } });
}

/** A meeting token so the display name is set by Panameer (provider number / "{company} interviewer"). */
export async function meetingToken(roomName: string, userName: string, isOwner: boolean, expiresAt: Date) {
  const out = await call<{ token: string }>("/meeting-tokens", { properties: { room_name: roomName, user_name: userName, is_owner: isOwner, exp: Math.floor(expiresAt.getTime() / 1000) } });
  return out?.token ?? null;
}
