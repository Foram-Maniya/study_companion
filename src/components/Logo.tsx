import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: "w-7 h-7", text: "text-lg" },
    md: { box: "w-8 h-8", text: "text-xl" },
    lg: { box: "w-10 h-10", text: "text-2xl" },
  };
  const s = sizes[size];

  return (
    <Link to="/" className={cn("flex items-center gap-2 font-bold", className)}>
      <div className={cn("relative flex items-center justify-center rounded-lg gradient-bg", s.box)}>
        <svg viewBox="0 0 24 24" fill="none" className="w-1/2 h-1/2">
          <path
            d="M12 3L20 7V17L12 21L4 17V7L12 3Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2" fill="white" />
        </svg>
      </div>
      <span className={cn("tracking-tight", s.text)}>
        Study<span className="gradient-text">Sphere</span>
      </span>
    </Link>
  );
}
