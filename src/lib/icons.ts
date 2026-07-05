import {
  Folder,
  Code,
  Palette,
  Megaphone,
  Scale,
  Wallet,
  Settings,
  Users,
  Shield,
  Truck,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  folder: Folder,
  code: Code,
  palette: Palette,
  megaphone: Megaphone,
  scale: Scale,
  wallet: Wallet,
  settings: Settings,
  users: Users,
  shield: Shield,
  truck: Truck,
};

export function areaIcon(name: string): LucideIcon {
  return MAP[name] ?? Folder;
}
