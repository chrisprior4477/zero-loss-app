import type { SVGProps } from "react";

export type AccountIconName = "all" | "active" | "prize" | "completion" | "completed" | "wallet" | "layers" | "gift" | "orders" | "crew" | "bell" | "security" | "install" | "signout" | "arrow" | "chevron";

/** Small, decorative line icons shared by the account showroom and drawer. */
export function AccountIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: AccountIconName }) {
  const paths = {
    all: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    active: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6M12 2v3M18 6l2-2" /></>,
    prize: <><path d="M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v6m-4 1h8" /></>,
    completion: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    completed: <><path d="m3 12 4 4 8-9m-3 7 3 3 6-8" /></>,
    wallet: <><path d="M20 7H5a2 2 0 0 1 0-4h12v4M3 5v14a2 2 0 0 0 2 2h15V7m0 5h-5v5h5" /><path d="M16 14.5h.01" /></>,
    layers: <><path d="m12 2 10 6-10 6L2 8l10-6ZM3 13l9 5 9-5M3 18l9 5 9-5" /></>,
    gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z" /></>,
    orders: <><path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5m-9 5v10M7 4l10 6" /></>,
    crew: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 6h4m-2-2v4M17 13a5 5 0 0 1 4 5v2"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10ZM10 21h4" /></>,
    security: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z" /><path d="m8 12 3 3 5-6" /></>,
    install: <><path d="M7 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M14 3h7v7M21 3l-9 9M8 17h8" /></>,
    signout: <><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M14 8l5 4-5 4M19 12H9" /></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
