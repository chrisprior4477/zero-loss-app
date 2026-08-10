export type NavLink = {
  href: string;
  label: string;
};

export const primaryNav: NavLink[] = [
  { href: "/browse", label: "Browse" },
  { href: "/how-it-works", label: "How It Works" },
];

export const footerLinkGroups: {
  title: string;
  links: NavLink[];
}[] = [
  {
    title: "Explore",
    links: [
      { href: "/browse", label: "Browse" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/support", label: "Support" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];
