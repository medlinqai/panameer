// Route helpers for links that have moved before; check:dead-links proves every literal href resolves.
export const ROUTES = {
  colleagues: "/connect/connections",
  // Connect (2026-10-08): every Connect page lives under /connect/.
  connect: {
    leaders: "/connect/leaders",
    community: "/connect/community",
    connections: "/connect/connections",
    mentors: "/connect/mentors",
    groups: "/connect/groups",
    group: (slug: string) => `/connect/groups/${slug}`,
    thread: (id: string) => `/connect/groups/thread/${id}`,
    score: "/connect/score",
    recommendations: "/connect/recommendations",
  },
  reportProblem: "/support/bug",
  learnPathEditor: (id: string) => `/admin/setup/learn-authoring/${id}`,
} as const;
