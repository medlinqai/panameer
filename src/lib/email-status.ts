export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export const EMAIL_UNAVAILABLE_NOTE =
  "Email delivery isn't switched on yet, so these stay in the app. Your choices are saved and will apply as soon as it is.";
