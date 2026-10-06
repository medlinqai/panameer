// Route helpers for links that have moved before; check:dead-links proves every literal href resolves.
export const ROUTES = {
  colleagues: "/community/colleagues",
  reportProblem: "/support/bug",
  learnPathEditor: (id: string) => `/admin/setup/learn-authoring/${id}`,
} as const;
