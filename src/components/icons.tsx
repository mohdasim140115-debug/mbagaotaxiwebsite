import {
  BadgeCheck,
  Briefcase,
  Building2,
  Clock,
  Bus,
  Camera,
  Car,
  CarTaxiFront,
  Headset,
  Hotel,
  MapPinned,
  Palmtree,
  Route,
  Users,
  PlaneTakeoff,
  Ship,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Umbrella,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Lucide equivalents of the Font Awesome icons used on the original site.
const ICONS: Record<string, LucideIcon> = {
  "plane-takeoff": PlaneTakeoff,
  "train-front": TrainFront,
  bus: Bus,
  "car-taxi-front": CarTaxiFront,
  hotel: Hotel,
  umbrella: Umbrella,
  ship: Ship,
  briefcase: Briefcase,
  "map-pinned": MapPinned,
  wallet: Wallet,
  "shield-check": ShieldCheck,
  headset: Headset,
  sparkles: Sparkles,
  "badge-check": BadgeCheck,
  "building-2": Building2,
  clock: Clock,
  route: Route,
  users: Users,
  car: Car,
  palmtree: Palmtree,
  camera: Camera,
};

export function CmsIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.44 9.44 0 0 1-1.45-5.04c0-5.22 4.25-9.47 9.48-9.47a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.52A11.32 11.32 0 0 0 12.04.64C5.76.64.65 5.75.65 12.03c0 2 .52 3.96 1.52 5.69L.55 23.64l6.05-1.59a11.36 11.36 0 0 0 5.43 1.38h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.19-5.9-3.33-8.06z" />
    </svg>
  );
}
