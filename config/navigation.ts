export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
  icon?: string;
  label?: string;
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[];
}

export interface MainNavItem extends NavItem {}

export interface SidebarNavItem extends NavItemWithChildren {}

export const mainNav: MainNavItem[] = [
  {
    title: 'Home',
    href: '/',
  },
  {
    title: 'Templates',
    href: '/templates',
  },
  {
    title: 'Animation',
    href: '/animation',
  },
  {
    title: 'Dashboard',
    href: '/dashboard',
  },
];

export const footerNav = {
  product: [
    { title: 'Features', href: '/#features' },
    { title: 'Templates', href: '/templates' },
    { title: 'Pricing', href: '/pricing' },
    { title: 'API', href: '/api-docs' },
  ],
  company: [
    { title: 'About', href: '/about' },
    { title: 'Blog', href: '/blog' },
    { title: 'Careers', href: '/careers' },
    { title: 'Contact', href: '/contact' },
  ],
  legal: [
    { title: 'Privacy', href: '/privacy' },
    { title: 'Terms', href: '/terms' },
    { title: 'Cookie Policy', href: '/cookies' },
  ],
  social: [
    { title: 'Twitter', href: 'https://twitter.com', external: true },
    { title: 'GitHub', href: 'https://github.com', external: true },
    { title: 'Discord', href: 'https://discord.com', external: true },
  ],
};

