import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ListChecks, Plus, Trash2, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({ meta: [{ title: "Application Tracker — NextCareer" }] }),
  component: Page,
});

const STATUSES = ["applied", "interview", "offer", "rejected", "accepted"] as const;
type Status = typeof STATUSES[number];

const statusColor: Record<Status, string> = {
  applied: "bg-primary/20 text-primary-glow",
  interview: "bg-warning/20 text-warning",
  offer: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
  accepted: "bg-success/30 text-success",
};

type App = {
  id: string; company: string; role: string; status: Status;
  applied_date: string | null; interview_date: string | null; follow_up_date: string | null;
  notes: string | null; url: string | null;
};

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: apps = [] } = useQuery({
    queryKey: ["applications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<App[]> => {
      const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as App[];
    },
  });

  const { data: packs = [] } = useQuery({
    queryKey: ["application-packs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("application_packs").select("*");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const packByApp = new Map<string, any>(packs.map((p: any) => [p.application_id, p]));
  const [openPack, setOpenPack] = useState<any | null>(null);

  const create = useMutation({
    mutationFn: async (input: Partial<App>) => {
      const { error } = await supabase.from("applications").insert({ ...input, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); setOpen(false); toast.success("Application added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); toast.success("Deleted"); },
  });

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: apps.filter((a) => a.status === s).length }), {} as Record<Status, number>);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold flex items-center gap-3"><ListChecks className="h-7 w-7 text-primary-glow" /> Application Tracker</h1>
          <p className="text-muted-foreground mt-1">Track every job you apply to.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="hero" className="shrink-0"><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
          <AppForm onSubmit={(v) => create.mutate(v)} busy={create.isPending} />
        </Dialog>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUSES.map((s) => (
          <div key={s} className="glass-card rounded-xl p-4">
            <div className="text-xs text-muted-foreground capitalize">{s}</div>
            <div className="text-2xl font-bold mt-1">{counts[s]}</div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {apps.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No applications yet. Add your first one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-medium">Company</th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Applied</th>
                  <th className="text-left p-3 font-medium">Interview</th>
                  <th className="text-left p-3 font-medium">Follow-up</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        {a.company}
                        {a.url && <a href={a.url} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary-glow"><ExternalLink className="h-3.5 w-3.5" /></a>}
                      </div>
                    </td>
                    <td className="p-3">{a.role}</td>
                    <td className="p-3">
                      <Select value={a.status} onValueChange={(v) => updateStatus.mutate({ id: a.id, status: v as Status })}>
                        <SelectTrigger className={`h-7 text-xs w-32 ${statusColor[a.status]}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-muted-foreground">{a.applied_date ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{a.interview_date ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{a.follow_up_date ?? "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {packByApp.get(a.id) && (
                          <Button variant="ghost" size="icon" title="View application pack" onClick={() => setOpenPack(packByApp.get(a.id))}>
                            <FileText className="h-4 w-4 text-primary-glow" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!openPack} onOpenChange={(v) => !v && setOpenPack(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{openPack?.job_company} · {openPack?.job_role}</DialogTitle>
          </DialogHeader>
          {openPack && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-primary/20 text-primary-glow">Match {openPack.match_score}%</span>
                {openPack.salary_low && openPack.salary_high && (
                  <span className="px-2 py-1 rounded-full bg-success/20 text-success">
                    {openPack.salary_currency} {Math.round(openPack.salary_low).toLocaleString()}–{Math.round(openPack.salary_high).toLocaleString()} / {openPack.salary_period}
                  </span>
                )}
                {openPack.job_url && (
                  <a href={openPack.job_url} target="_blank" rel="noopener" className="px-2 py-1 rounded-full bg-secondary text-foreground inline-flex items-center gap-1">
                    Job posting <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <section>
                <h4 className="text-sm font-semibold mb-2">Tailored CV</h4>
                <pre className="whitespace-pre-wrap text-sm font-sans bg-secondary/40 rounded-xl p-4">{openPack.tailored_cv}</pre>
              </section>
              <section>
                <h4 className="text-sm font-semibold mb-2">Cover letter</h4>
                <pre className="whitespace-pre-wrap text-sm font-sans bg-secondary/40 rounded-xl p-4">{openPack.cover_letter}</pre>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AppForm({ onSubmit, busy }: { onSubmit: (v: Partial<App>) => void; busy: boolean }) {
  const [v, setV] = useState<Partial<App>>({ status: "applied" as Status, applied_date: new Date().toISOString().slice(0, 10) });
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Add application</DialogTitle></DialogHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); if (!v.company || !v.role) return; onSubmit(v); }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company"><Input required value={v.company ?? ""} onChange={(e) => setV({ ...v, company: e.target.value })} /></Field>
          <Field label="Role"><Input required value={v.role ?? ""} onChange={(e) => setV({ ...v, role: e.target.value })} /></Field>
        </div>
        <Field label="Status">
          <Select value={v.status as string} onValueChange={(s) => setV({ ...v, status: s as Status })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Applied"><Input type="date" value={v.applied_date ?? ""} onChange={(e) => setV({ ...v, applied_date: e.target.value || null })} /></Field>
          <Field label="Interview"><Input type="date" value={v.interview_date ?? ""} onChange={(e) => setV({ ...v, interview_date: e.target.value || null })} /></Field>
          <Field label="Follow-up"><Input type="date" value={v.follow_up_date ?? ""} onChange={(e) => setV({ ...v, follow_up_date: e.target.value || null })} /></Field>
        </div>
        <Field label="URL"><Input type="url" value={v.url ?? ""} onChange={(e) => setV({ ...v, url: e.target.value || null })} placeholder="https://…" /></Field>
        <Field label="Notes"><Textarea rows={3} value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value || null })} /></Field>
        <DialogFooter><Button type="submit" variant="hero" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
