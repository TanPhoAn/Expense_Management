import React from "react";
import {
  PiggyBank,
  Laptop,
  Car,
  Plane,
  Home,
  Shield,
  Smartphone,
  Heart,
  Sparkles,
  Gift,
  GraduationCap,
  Briefcase,
  Watch,
  Camera,
  Tv,
  HelpCircle,
  LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  PiggyBank,
  Laptop,
  Car,
  Plane,
  Home,
  Shield,
  Smartphone,
  Heart,
  Sparkles,
  Gift,
  GraduationCap,
  Briefcase,
  Watch,
  Camera,
  Tv,
};

export const AVAILABLE_SAVINGS_ICONS = [
  { name: "PiggyBank", label: "Ống heo" },
  { name: "Smartphone", label: "Điện thoại" },
  { name: "Laptop", label: "Máy tính" },
  { name: "Plane", label: "Du lịch" },
  { name: "Car", label: "Xe cộ" },
  { name: "Home", label: "Nhà cửa" },
  { name: "Shield", label: "Dự phòng" },
  { name: "Gift", label: "Quà tặng" },
  { name: "GraduationCap", label: "Học tập" },
  { name: "Heart", label: "Sức khỏe" },
  { name: "Sparkles", label: "Mơ ước" },
  { name: "Briefcase", label: "Đầu tư" },
];

interface SavingsGoalIconProps {
  iconName?: string;
  className?: string;
}

export function SavingsGoalIcon({ iconName, className = "w-4 h-4" }: SavingsGoalIconProps) {
  const IconComponent = (iconName && ICON_MAP[iconName]) || PiggyBank;
  return <IconComponent className={className} />;
}
