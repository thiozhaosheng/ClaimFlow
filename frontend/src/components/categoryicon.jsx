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
} from "lucide-react";
import { categoryColor } from "../lib/categoryColors.js";

const ICON = {
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

/**
 * A category's icon inside a round badge. The icon SHAPE conveys the category;
 * the badge stays a single neutral brand tint (no decorative per-category hue),
 * so color in the UI is reserved for meaning (status, done/missing).
 * <CategoryIcon category="Meal" />
 */
export default function CategoryIcon({ category, size = 32, className = "" }) {
  const { icon } = categoryColor(category);
  const Icon = ICON[icon] || Tag;
  return (
    <span
      className={`cat-dot ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon className="h-1/2 w-1/2" />
    </span>
  );
}
