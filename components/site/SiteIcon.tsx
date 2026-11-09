import type { CSSProperties } from "react";

const paths = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  cards: "M7 3h13v17H7zM3 7v15h13",
  pack: "M5 3h14v18H5zM5 7h14M5 17h14m-10-7 3-2 3 2v3l-3 2-3-2z",
  history: "M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v6l4 2",
  shop: "M4 9h16l-2-6H6L4 9Zm1 0v12h14V9M9 21v-7h6v7M4 9c0 4 4 4 4 0 0 4 4 4 4 0 0 4 4 4 4 0 0 4 4 4 4 0",
  help: "M9.1 9a3 3 0 1 1 5.8 1c-.9 1.5-2.9 1.5-2.9 4m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  book: "M12 5v16M3 3c4-1 6 0 9 2 3-2 5-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2V3Z",
  mail: "M3 5h18v14H3zM3 5l9 8 9-8",
  gift: "M3 8h18v5H3zM5 13v8h14v-8M12 8v13m0-13C7 8 4 6 6 3s6 1 6 5Zm0 0c5 0 8-2 6-5s-6 1-6 5Z",
  daily: "M4 5h16v16H4zM8 3v4m8-4v4M4 10h16m-12 5 3 3 5-5",
  coin: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM10 17V7h3a3 3 0 0 1 0 6h-3",
  search: "m16 16 5 5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0ZM7 10.5h7m-3.5-3.5v7",
  close: "m5 5 14 14M19 5 5 19",
  minus: "M5 12h14",
  plus: "M5 12h14M12 5v14",
  first: "m11 6-6 6 6 6m8-12-6 6 6 6",
  last: "m5 6 6 6-6 6m8-12 6 6-6 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  info: "M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  account: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
} as const;

export type SiteIconName = keyof typeof paths;

export default function SiteIcon({ name, className, style }: { name: SiteIconName; className?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
