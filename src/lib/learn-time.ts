// "48 min" / "1.5 h" for Learn (client-safe).
export const timeLabel = (min: number) => (!min ? null : min < 60 ? `${min} min` : `${Math.round((min / 60) * 2) / 2} h`);
