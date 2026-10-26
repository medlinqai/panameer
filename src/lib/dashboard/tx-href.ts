/** Link to My Transactions (/dashboard/transactions), filtered. Plain module so server and client components can both call it. */
export const txHref = (side: string, q: Record<string, string> = {}) => `/dashboard/transactions?${new URLSearchParams({ side, ...q }).toString()}`;
