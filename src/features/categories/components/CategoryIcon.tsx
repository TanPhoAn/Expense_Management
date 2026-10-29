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
  Coffee,
  Dumbbell,
  Plane,
  Gift,
  Briefcase,
  Smartphone,
  Wifi,
  Shirt,
  Heart,
  Baby,
  PawPrint,
  PiggyBank,
  CreditCard,
  Fuel,
  Tv,
  Gamepad2,
  Bus,
  Wrench,
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
  coffee: Coffee,
  dumbbell: Dumbbell,
  plane: Plane,
  gift: Gift,
  briefcase: Briefcase,
  smartphone: Smartphone,
  wifi: Wifi,
  shirt: Shirt,
  heart: Heart,
  baby: Baby,
  pawprint: PawPrint,
  piggybank: PiggyBank,
  creditcard: CreditCard,
  fuel: Fuel,
  tv: Tv,
  gamepad2: Gamepad2,
  bus: Bus,
  wrench: Wrench,
};

export interface CategoryIconOption {
  key: string;
  name: string;
  icon: LucideIcon;
  category: "daily" | "living" | "income" | "lifestyle";
}

export const AVAILABLE_CATEGORY_ICONS: CategoryIconOption[] = [
  // Hàng ngày & Ăn uống
  { key: "utensils", name: "Ăn uống", icon: Utensils, category: "daily" },
  { key: "coffee", name: "Cà phê & Trà", icon: Coffee, category: "daily" },
  { key: "shoppingbag", name: "Mua sắm", icon: ShoppingBag, category: "daily" },
  { key: "shirt", name: "Thời trang", icon: Shirt, category: "daily" },

  // Di chuyển & Tiện ích
  { key: "car", name: "Xe cộ / Đi lại", icon: Car, category: "living" },
  { key: "fuel", name: "Xăng dầu", icon: Fuel, category: "living" },
  { key: "bus", name: "Xe bus / Tàu", icon: Bus, category: "living" },
  { key: "home", name: "Nhà cửa", icon: Home, category: "living" },
  { key: "filetext", name: "Hóa đơn / Điện nước", icon: FileText, category: "living" },
  { key: "wifi", name: "Internet / Wifi", icon: Wifi, category: "living" },
  { key: "smartphone", name: "Điện thoại / 4G", icon: Smartphone, category: "living" },
  { key: "wrench", name: "Sửa chữa", icon: Wrench, category: "living" },

  // Phong cách sống & Sức khỏe
  { key: "film", name: "Giải trí / Phim ảnh", icon: Film, category: "lifestyle" },
  { key: "gamepad2", name: "Trò chơi / Game", icon: Gamepad2, category: "lifestyle" },
  { key: "tv", name: "Truyền hình / Sub", icon: Tv, category: "lifestyle" },
  { key: "plane", name: "Du lịch / Vé máy bay", icon: Plane, category: "lifestyle" },
  { key: "heartpulse", name: "Sức khỏe / Y tế", icon: HeartPulse, category: "lifestyle" },
  { key: "dumbbell", name: "Thể thao / Gym", icon: Dumbbell, category: "lifestyle" },
  { key: "graduationcap", name: "Giáo dục / Khóa học", icon: GraduationCap, category: "lifestyle" },
  { key: "gift", name: "Quà tặng", icon: Gift, category: "lifestyle" },
  { key: "baby", name: "Trẻ em / Em bé", icon: Baby, category: "lifestyle" },
  { key: "pawprint", name: "Thú cưng", icon: PawPrint, category: "lifestyle" },

  // Thu nhập & Tài chính
  { key: "banknote", name: "Tiền lương", icon: Banknote, category: "income" },
  { key: "award", name: "Tiền thưởng", icon: Award, category: "income" },
  { key: "trendingup", name: "Đầu tư / Sinh lời", icon: TrendingUp, category: "income" },
  { key: "piggybank", name: "Tiết kiệm", icon: PiggyBank, category: "income" },
  { key: "creditcard", name: "Thẻ / Hoàn tiền", icon: CreditCard, category: "income" },
  { key: "briefcase", name: "Việc làm thêm", icon: Briefcase, category: "income" },
  { key: "coins", name: "Khác / Thu nhập phụ", icon: Coins, category: "income" },
  { key: "tag", name: "Nhãn tùy biến", icon: Tag, category: "daily" },
];

/**
 * Resolves appropriate Lucide icon component based on icon key or category name.
 */
export function getCategoryLucideIcon(iconName?: string, categoryName?: string): LucideIcon {
  const normalizedIcon = (iconName || "").toLowerCase().replace(/[-_]/g, "");
  if (normalizedIcon && ICON_MAP[normalizedIcon]) {
    return ICON_MAP[normalizedIcon];
  }

  const name = (categoryName || "").toLowerCase();
  if (name.includes("ăn") || name.includes("uống") || name.includes("food") || name.includes("cà phê") || name.includes("coffee") || name.includes("trà")) return Utensils;
  if (name.includes("di chuyển") || name.includes("xe") || name.includes("xăng") || name.includes("grab") || name.includes("bus")) return Car;
  if (name.includes("quần áo") || name.includes("thời trang")) return Shirt;
  if (name.includes("mua") || name.includes("sắm") || name.includes("siêu thị") || name.includes("shop")) return ShoppingBag;
  if (name.includes("hóa đơn") || name.includes("điện") || name.includes("nước") || name.includes("tiện ích")) return FileText;
  if (name.includes("internet") || name.includes("wifi")) return Wifi;
  if (name.includes("điện thoại") || name.includes("card") || name.includes("4g")) return Smartphone;
  if (name.includes("nhà") || name.includes("phòng") || name.includes("thuê")) return Home;
  if (name.includes("du lịch") || name.includes("vé máy bay") || name.includes("khách sạn")) return Plane;
  if (name.includes("game") || name.includes("trò chơi")) return Gamepad2;
  if (name.includes("giải trí") || name.includes("phim") || name.includes("cinema")) return Film;
  if (name.includes("gym") || name.includes("thể thao") || name.includes("fitness")) return Dumbbell;
  if (name.includes("sức khỏe") || name.includes("thuốc") || name.includes("khám") || name.includes("y tế")) return HeartPulse;
  if (name.includes("giáo dục") || name.includes("học") || name.includes("sách")) return GraduationCap;
  if (name.includes("lương") || name.includes("salary")) return Banknote;
  if (name.includes("thưởng") || name.includes("bonus")) return Award;
  if (name.includes("đầu tư") || name.includes("invest") || name.includes("lãi") || name.includes("chứng khoán")) return TrendingUp;
  if (name.includes("tiết kiệm") || name.includes("saving")) return PiggyBank;
  if (name.includes("quà") || name.includes("gift")) return Gift;
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
