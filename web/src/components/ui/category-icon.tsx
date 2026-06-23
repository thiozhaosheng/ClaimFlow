import {
  Car,
  Utensils,
  Wine,
  Package,
  Plane,
  GraduationCap,
  Heart,
  Dumbbell,
  Users,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { categoryIconKey, type IconKey } from "@/core/domain/categories";
import { cn } from "@/lib/cn";

const ICONS: Record<IconKey, LucideIcon> = {
  car: Car,
  utensils: Utensils,
  wine: Wine,
  package: Package,
  plane: Plane,
  graduation: GraduationCap,
  heart: Heart,
  dumbbell: Dumbbell,
  users: Users,
  tag: Tag,
};

/** Round, neutral-tinted icon badge. Color stays neutral (semantic-only UI). */
export function CategoryIcon({
  category,
  className,
  iconClassName,
}: {
  category: string | null | undefined;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = ICONS[categoryIconKey(category)];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-surface text-fg-secondary",
        className,
      )}
    >
      <Icon className={cn("h-1/2 w-1/2", iconClassName)} />
    </span>
  );
}
