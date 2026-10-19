// Recipe search sources, cycled by 「換一個」 (SPEC §6.4). No paid AI.
export const recipeSources = [
  { name: 'YouTube', url: (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${q} 食譜`)}` },
  { name: '愛料理', url: (q: string) => `https://icook.tw/search/${encodeURIComponent(q)}/` },
  { name: 'Google', url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(`${q} 食譜`)}` },
] as const

/** Most plushes drawn in the claw machine (options + wishes); more → a random subset. */
export const CLAW_MAX_ITEMS = 30

/** Most standing claw machine options. Mirrored by the wheel_options trigger in the database. */
export const SPINNER_MAX_OPTIONS = 24
