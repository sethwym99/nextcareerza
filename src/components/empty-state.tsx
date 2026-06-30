import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction, children }: Props) {
  const button =
    actionLabel &&
    (actionTo ? (
      <Link to={actionTo}>
        <Button variant="hero">{actionLabel}</Button>
      </Link>
    ) : (
      <Button variant="hero" onClick={onAction}>
        {actionLabel}
      </Button>
    ));
  return (
    <div className="glass-card rounded-2xl p-10 text-center flex flex-col items-center gap-3">
      <div className="h-14 w-14 rounded-2xl grid place-items-center bg-[image:var(--gradient-primary)]/20 border border-primary/30">
        <Icon className="h-7 w-7 text-primary-glow" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-md">{description}</p>}
      {children}
      {button && <div className="mt-2">{button}</div>}
    </div>
  );
}
