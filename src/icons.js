const paths = {
  career: "M4 21V4m1 1c5-5 9 4 16-1v10c-7 5-11-4-16 1",
  free: "m2 19 6-10 5 7 3-5 6 8H2zm10-10 2-4 4 6",
  quick: "m3 6 7 6-7 6m8-12 7 6-7 6",
  tuning: "M3 6h7m4 0h7M3 12h12m4 0h2M3 18h2m4 0h12M10 3v6m5 0v6M6 15v6",
  stats: "M4 19V9m7 10V4m7 15v-7",
  settings: "M4 5h16M4 12h16M4 19h16m-9-17v6m5 1v6m-8 1v6",
  clips: "M3 7h18v13H3zM3 7l2-4h16l-2 4m-9 3 5 3-5 3z",
};
export const icon = (k) =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="round" aria-hidden="true"><path d="' +
  paths[k] +
  '"/></svg>';
