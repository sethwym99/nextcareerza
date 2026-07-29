import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ListChecks, Plus, Trash2, ExternalLink, FileText, Bell, Rows3, Columns3, BellRing, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import {
  ensureNotificationPermission,
  syncApplicationReminders,
  cancelApplicationReminders,
} from "@/lib/notifications";
import { isNativeApp } from "@/lib/platform";

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
  const [view, setView] = useState<"list" | "board">("list");
  const [notifOn, setNotifOn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isNativeApp()) { setNotifOn(false); return; }
    let cancelled = false;
    (async () => {
      const ok = await ensureNotificationPermission();
      if (!cancelled) setNotifOn(ok);
    })();
    return () => { cancelled = true; };
  }, []);

  const { data: apps = [] } = useQuery({
    queryKey: ["applications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<App[]> => {
      const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as App[];
    },
  });

  // Re-sync reminders whenever apps change on native
  useEffect(() => {
    if (!isNativeApp() || !notifOn) return;
    apps.forEach((a) => { void syncApplicationReminders(a); });
  }, [apps, notifOn]);

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
  const [notesFor, setNotesFor] = useState<App | null>(null);

  const create = useMutation({
    mutationFn: async (input: Partial<App>) => {
      const { data, error } = await supabase.from("applications").insert({ ...input, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data as App;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      setOpen(false);
      toast.success("Application added");
      if (row) void syncApplicationReminders(row);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateApp = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<App> }) => {
      const { data, error } = await supabase.from("applications").update(patch as any).eq("id", id).select().single();
      if (error) throw error;
      return data as App;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      if (row) void syncApplicationReminders(row);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Deleted");
      void cancelApplicationReminders(id);
    },
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

      <Reminders apps={apps} notifOn={!!notifOn} />

      {apps.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-full border border-border bg-secondary/30 p-1 text-xs">
            <button
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${view === "list" ? "bg-background text-foreground" : "text-muted-foreground"}`}
            >
              <Rows3 className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setView("board")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${view === "board" ? "bg-background text-foreground" : "text-muted-foreground"}`}
            >
              <Columns3 className="h-3.5 w-3.5" /> Board
            </button>
          </div>
          {isNativeApp() && (
            <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <BellRing className="h-3 w-3" />
              {notifOn ? "Reminders on" : "Reminders off"}
            </div>
          )}
        </div>
      )}

      {apps.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No applications yet"
          description="Add your first job application. We'll remind you about interviews and follow-ups automatically."
          actionLabel="Add application"
          onAction={() => setOpen(true)}
        />
      ) : view === "list" ? (
        <div className="glass-card rounded-2xl overflow-hidden">
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
                      <Select value={a.status} onValueChange={(v) => updateApp.mutate({ id: a.id, patch: { status: v as Status } })}>
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
                        <Button variant="ghost" size="icon" title="Notes" onClick={() => setNotesFor(a)}>
                          <StickyNote className="h-4 w-4" />
                        </Button>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {STATUSES.map((s) => (
            <div key={s} className="glass-card rounded-2xl p-3 min-h-[160px]">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor[s]}`}>{s}</span>
                <span className="text-xs text-muted-foreground">{counts[s]}</span>
              </div>
              <div className="space-y-2">
                {apps.filter((a) => a.status === s).map((a) => (
                  <div key={a.id} className="rounded-xl border border-border bg-background/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{a.company}</div>
                        <div className="text-xs text-muted-foreground truncate">{a.role}</div>
                      </div>
                      <Select value={a.status} onValueChange={(v) => updateApp.mutate({ id: a.id, patch: { status: v as Status } })}>
                        <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent [&>svg]:opacity-60" aria-label="Move" />
                        <SelectContent>
                          {STATUSES.map((x) => <SelectItem key={x} value={x} className="capitalize">{x}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {(a.interview_date || a.follow_up_date) && (
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                        {a.interview_date && <span className="px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">Interview {a.interview_date}</span>}
                        {a.follow_up_date && <span className="px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Follow {a.follow_up_date}</span>}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNotesFor(a)}>
                        <StickyNote className="h-3.5 w-3.5" />
                      </Button>
                      {a.url && (
                        <a href={a.url} target="_blank" rel="noopener" className="h-6 w-6 grid place-items-center text-muted-foreground hover:text-primary-glow">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => del.mutate(a.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {counts[s] === 0 && (
                  <div className="text-[11px] text-muted-foreground text-center py-4 opacity-70">Nothing here</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes editor */}
      <Dialog open={!!notesFor} onOpenChange={(v) => !v && setNotesFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{notesFor?.company} · {notesFor?.role}</DialogTitle>
          </DialogHeader>
          {notesFor && (
            <NotesEditor
              key={notesFor.id}
              initial={notesFor.notes ?? ""}
              onSave={(notes) => {
                updateApp.mutate({ id: notesFor.id, patch: { notes } }, {
                  onSuccess: () => { toast.success("Notes saved"); setNotesFor(null); },
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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

function NotesEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="space-y-3">
      <Textarea rows={8} value={v} onChange={(e) => setV(e.target.value)} placeholder="Recruiter contact, salary discussed, follow-up notes…" />
      <DialogFooter>
        <Button variant="hero" onClick={() => onSave(v)}>Save notes</Button>
      </DialogFooter>
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

function Reminders({ apps, notifOn }: { apps: App[]; notifOn: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = apps
    .map((a) => {
      const items: { kind: "interview" | "follow-up"; date: string; app: App }[] = [];
      if (a.interview_date) items.push({ kind: "interview", date: a.interview_date, app: a });
      if (a.follow_up_date) items.push({ kind: "follow-up", date: a.follow_up_date, app: a });
      return items;
    })
    .flat()
    .filter((x) => x.date <= addDays(today, 7))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (upcoming.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-4 border border-primary/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary-glow" />
          <h3 className="font-semibold text-sm">Reminders · next 7 days</h3>
        </div>
        {isNativeApp() && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${notifOn ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>
            {notifOn ? "Push on" : "Push off"}
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {upcoming.map((x, i) => {
          const overdue = x.date < today;
          const isToday = x.date === today;
          return (
            <li key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">
                <span className="font-medium">{x.app.company}</span>
                <span className="text-muted-foreground"> · {x.app.role} · {x.kind}</span>
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${overdue ? "bg-destructive/20 text-destructive" : isToday ? "bg-warning/20 text-warning" : "bg-secondary text-muted-foreground"}`}>
                {overdue ? "Overdue · " : isToday ? "Today · " : ""}{x.date}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
