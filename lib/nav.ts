import {
  Sun,
  ListChecks,
  Map,
  OctagonAlert,
  FileText,
  Wallet,
  Gauge,
  Flame,
  History,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/setup", label: "Setup", icon: ListChecks },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/blockers", label: "Blockers", icon: OctagonAlert },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/costs", label: "Costs", icon: Wallet },
  { href: "/readiness", label: "Readiness", icon: Gauge },
  { href: "/progress", label: "Progress", icon: Flame },
  { href: "/activity", label: "Activity", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Priority set for the mobile bottom bar (section 54): Today, Blockers, plus Capture/Focus actions. */
export const MOBILE_PRIMARY_HREFS = ["/", "/setup", "/blockers"];
