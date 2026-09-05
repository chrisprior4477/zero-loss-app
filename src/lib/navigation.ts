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
    title: "Marketplace",
    links: [
      { href: "/browse", label: "All Rewards" },
      { href: "/browse?sort=ending-soon", label: "Ending Soon" },
      { href: "/browse?view=winners", label: "Winners" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Careers" },
      { href: "/about", label: "Blog" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/support", label: "Help Center" },
      { href: "/contact", label: "Contact Us" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/responsible-participation", label: "Responsible Play" },
    ],
  },
];
