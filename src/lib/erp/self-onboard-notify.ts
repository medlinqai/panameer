// EO-E004: the notices after a self-onboarding punch-in (filled in by EO-E004).
export async function afterSelfOnboard(_made: { conn: { id: string }; personId: string; companyName: string; email: string; hasUser: boolean }, _origin: string): Promise<void> {}
