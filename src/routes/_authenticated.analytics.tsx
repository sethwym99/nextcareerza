import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  BarChart3,
  Target,
  MessageSquare,
  Award,
  Clock,
  TrendingUp,
  Briefcase,
} from "lucide-react";
import { getApplicationAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Application Analytics — NextCareer" },
      { name: "description", content: "See what is working in your job search." },
      { property: "og:title", content: "Application Analytics — NextCareer" },
      { property: "og:description", content: "Response rates, pipeline funnel, and weekly activity for your job search." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const PIPELINE_ORDER = ["applied", "interview", "offer", "accepted", "rejected"] as const;
const PIPELINE_LABELS: Record<string, string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
};

function Page() {
  const fn = useServerFn(getApplicationAnalytics);
  const { data } = useQuery({
    queryKey: ["application-analytics"],
    queryFn: () => fn({ data: undefined as any }),
  });

  const pipelineData = PIPELINE_ORDER.map((key) => ({
    name: PIPELINE_LABELS[key],
    count: data?.pipeline?.[key] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary-glow" /> Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Understand what is working in your job search.
        </p>
      </header>

      {data?.total === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
          <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No applications tracked yet.</p>
          <p className="text-xs mt-1">Add applications in Tracker to see your stats.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Target}
              label="Response rate"
              value={`${data?.responseRate ?? 0}%`}
              hint="Moved past applied"
            />
            <StatCard
              icon={MessageSquare}
              label="Interview rate"
              value={`${data?.interviewRate ?? 0}%`}
              hint="Reached interview+"
            />
            <StatCard
              icon={Award}
              label="Offer rate"
              value={`${data?.offerRate ?? 0}%`}
              hint="Offer or accepted"
            />
            <StatCard
              icon={Clock}
              label="Avg. days to interview"
              value={data?.avgDaysToInterview ? `${data.avgDaysToInterview}d` : "—"}
              hint={data?.avgDaysToInterview ? "From applied date" : "Need more data"}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary-glow" />
                <h3 className="font-semibold text-sm">Weekly activity</h3>
              </div>
              <div className="h-56">
                {data?.weekly?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weekly} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--secondary)", opacity: 0.4 }}
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "0.75rem",
                          color: "var(--foreground)",
                        }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {(data.weekly ?? []).map((_, i) => (
                          <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full grid place-items-center text-sm text-muted-foreground">
                    No activity yet
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-primary-glow" />
                <h3 className="font-semibold text-sm">Pipeline</h3>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--secondary)", opacity: 0.4 }}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.75rem",
                        color: "var(--foreground)",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {pipelineData.map((_, i) => (
                        <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-4">
              <h3 className="font-semibold text-sm mb-3">Top sources</h3>
              {data?.topSources?.length ? (
                <ul className="space-y-2">
                  {data.topSources.map((s) => (
                    <li
                      key={s.name}
                      className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary">
                        {s.count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No source data yet.</p>
              )}
            </div>

            <div className="glass-card rounded-2xl p-4">
              <h3 className="font-semibold text-sm mb-3">Best matched applications</h3>
              {data?.bestMatches?.length ? (
                <ul className="space-y-2">
                  {data.bestMatches.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0"
                    >
                      <span className="truncate">
                        {m.company} · {m.role}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary-glow">
                        {m.score}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No match scores yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
    </div>
  );
}
