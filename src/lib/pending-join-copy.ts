// PB-E002: the one waiting line (client-safe).
export const waitingLine = (p: { company: string; admin: string }) => `Waiting for ${p.admin} at ${p.company} to approve you. We'll email you the moment they do.`;
