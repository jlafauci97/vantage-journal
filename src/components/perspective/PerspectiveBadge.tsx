import { cn } from "@/lib/utils";

interface PerspectiveBadgeProps {
  name?: string;
  color?: string | null;
  perspective?: {
    name: string;
    color: string | null;
  };
  size?: "sm" | "md" | "lg";
  active?: boolean;
  onClick?: () => void;
}

export function PerspectiveBadge({
  name: nameProp,
  color: colorProp,
  perspective,
  size = "sm",
  active = false,
  onClick,
}: PerspectiveBadgeProps) {
  const name = nameProp || perspective?.name || "";
  const color = colorProp ?? perspective?.color ?? "#002168";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        "perspective-pill inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap",
        sizeClasses[size],
        onClick && "cursor-pointer",
        active && "active ring-2 ring-offset-1"
      )}
      style={{
        backgroundColor: active ? (color || "#002168") : `${color || "#002168"}20`,
        color: active ? "white" : (color || "#002168"),
        borderColor: color || "#002168",
      }}
    >
      {name}
    </span>
  );
}
