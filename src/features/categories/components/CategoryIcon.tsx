import React from "react";
import {
  Utensils,
  Car,
  ShoppingBag,
  FileText,
  Home,
  Film,
  HeartPulse,
  GraduationCap,
  Banknote,
  Award,
  TrendingUp,
  Coins,
  Tag,
  LucideIcon,
  LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  shoppingbag: ShoppingBag,
  filetext: FileText,
  home: Home,
  film: Film,
  heartpulse: HeartPulse,
  graduationcap: GraduationCap,
  banknote: Banknote,
  award: Award,
  trendingup: TrendingUp,
  coins: Coins,
  tag: Tag,
};

/**
 * Resolves appropriate Lucide icon component based on icon key or category name.
 */
export function getCategoryLucideIcon(iconName?: string, categoryName?: string): LucideIcon {
  const normalizedIcon = (iconName || "").toLowerCase().replace(/[-_]/g, "");
  if (normalizedIcon && ICON_MAP[normalizedIcon]) {
    return ICON_MAP[normalizedIcon];
  }

  const name = (categoryName || "").toLowerCase();
  if (name.includes("ăn") || name.includes("uống") || name.includes("food") || name.includes("cà phê")) return Utensils;
  if (name.includes("di chuyển") || name.includes("xe") || name.includes("xăng") || name.includes("grab")) return Car;
  if (name.includes("mua") || name.includes("sắm") || name.includes("siêu thị") || name.includes("shop")) return ShoppingBag;
  if (name.includes("hóa đơn") || name.includes("điện") || name.includes("nước") || name.includes("tiện ích")) return FileText;
  if (name.includes("nhà") || name.includes("phòng") || name.includes("thuê")) return Home;
  if (name.includes("giải trí") || name.includes("phim") || name.includes("game") || name.includes("du lịch")) return Film;
  if (name.includes("sức khỏe") || name.includes("thuốc") || name.includes("khám") || name.includes("y tế")) return HeartPulse;
  if (name.includes("giáo dục") || name.includes("học") || name.includes("sách")) return GraduationCap;
  if (name.includes("lương") || name.includes("salary")) return Banknote;
  if (name.includes("thưởng") || name.includes("bonus")) return Award;
  if (name.includes("đầu tư") || name.includes("invest") || name.includes("lãi")) return TrendingUp;
  if (name.includes("khác") || name.includes("thu nhập") || name.includes("tiền")) return Coins;

  return Tag;
}

interface CategoryIconProps extends LucideProps {
  iconName?: string;
  categoryName?: string;
  color?: string;
  className?: string;
}

export function CategoryIcon({
  iconName,
  categoryName,
  className,
  ...props
}: CategoryIconProps) {
  const IconComponent = getCategoryLucideIcon(iconName, categoryName);
  return <IconComponent className={cn("w-4 h-4", className)} {...props} />;
}
