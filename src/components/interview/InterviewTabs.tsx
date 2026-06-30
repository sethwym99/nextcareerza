import { Link, useLocation } from "@tanstack/react-router";
import { Mic, History } from "lucide-react";

export function InterviewTabs() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/interview" as const, label: "Practice", icon: Mic },
    { to: "/interview-history" as const, label: "History", icon: History },
  ];
  return (
    <div className="glass-card rounded-xl p-1 inline-flex gap-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
              active
                ? "bg-[image:var(--gradient-primary)] text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
