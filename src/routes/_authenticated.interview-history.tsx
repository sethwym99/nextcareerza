import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listInterviewSessions } from "@/lib/interview-sessions.functions";
import { Mic, TrendingUp, Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/interview-history")({
  head: () => ({ meta: [{ title: "Interview History — NextCareer" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listInterviewSessions);
  const { data: sessions = [], isLoading } = useQuery({ queryKey: ["interview-sessions"], queryFn: () => fn() });

  const chartData = [...sessions]
    .slice()
    .reverse()
    .map((s: any, i) => ({
      idx: i + 1,
      score: s.score,
      label: new Date(s.created_at).toLocaleDateString(),
    }));

  const avg = sessions.length
    ? Math.round(sessions.reduce((a: number, s: any) => a + (s.score || 0), 0) / sessions.length)
    : 0;
  const best = sessions.reduce((m: number, s: any) => Math.max(m, s.score || 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Mic className="h-7 w-7 text-primary-glow" /> Interview History</h1>
        <p className="text-muted-foreground mt-1">Track every practice run and watch your progress.</p>
      </header>

      {isLoading ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">Loading…</div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="No interviews yet"
          description="Run a mock interview to start building your history and see your scores trend over time."
          actionLabel="Start an interview"
          actionTo="/interview"
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Sessions" value={sessions.length} />
            <Stat label="Average score" value={avg} suffix="/100" />
            <Stat label="Best score" value={best} suffix="/100" icon={Trophy} />
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary-glow" />
              <h3 className="font-semibold">Score over time</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="idx" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(_, p: any) => p?.[0]?.payload?.label ?? ""}
                  />
                  <Line type="monotone" dataKey="score" stroke="oklch(0.72 0.2 290)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Score</th>
                    <th className="text-left p-3 font-medium">Questions</th>
                    <th className="text-left p-3 font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s: any) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{s.role}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary-glow text-xs">{s.score}/100</span></td>
                      <td className="p-3 text-muted-foreground">{s.question_count}</td>
                      <td className="p-3 text-muted-foreground max-w-md truncate">{s.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, suffix, icon: Icon }: { label: string; value: number | string; suffix?: string; icon?: any }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">{Icon && <Icon className="h-3.5 w-3.5" />}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}{suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}</div>
    </div>
  );
}
