import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageSquare, ShieldCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — NextCareer" },
      { name: "description", content: "Get help with NextCareer. Contact us, read the FAQ, manage your account." },
      { property: "og:title", content: "Support — NextCareer" },
      { property: "og:url", content: "https://nextcareer.one/support" },
    ],
    links: [{ rel: "canonical", href: "https://nextcareer.one/support" }],
  }),
  component: SupportPage,
});

const faqs = [
  {
    q: "How do free vs Premium limits work?",
    a: "Free includes 3 CV analyses and 3 interview sessions per month. Smart Apply is Premium-only. Limits reset on the 1st.",
  },
  {
    q: "Where do my CVs and cover letters go?",
    a: "They're stored in your account so you can revisit them. Delete your account at any time to remove everything.",
  },
  {
    q: "Why didn't Smart Apply read my job link?",
    a: "Some sites (LinkedIn, Indeed) block automated reads. Paste the job description text into the second field as a fallback.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Open /billing and click Cancel. Access continues until the end of the paid period.",
  },
];

function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="font-display text-4xl font-bold mt-4">Support</h1>
      <p className="text-muted-foreground mt-2">We usually reply within one business day.</p>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <a
          href="mailto:support@nextcareer.one"
          className="glass-card rounded-2xl p-5 flex items-start gap-3 hover:border-primary/40 transition"
        >
          <Mail className="h-5 w-5 text-primary-glow shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Email support</div>
            <div className="text-sm text-muted-foreground">support@nextcareer.one</div>
          </div>
        </a>
        <Link to="/billing" className="glass-card rounded-2xl p-5 flex items-start gap-3 hover:border-primary/40 transition">
          <MessageSquare className="h-5 w-5 text-primary-glow shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Billing</div>
            <div className="text-sm text-muted-foreground">Manage or cancel your subscription.</div>
          </div>
        </Link>
        <Link to="/privacy" className="glass-card rounded-2xl p-5 flex items-start gap-3 hover:border-primary/40 transition">
          <ShieldCheck className="h-5 w-5 text-primary-glow shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Privacy</div>
            <div className="text-sm text-muted-foreground">How we handle your data.</div>
          </div>
        </Link>
        <Link to="/delete-account" className="glass-card rounded-2xl p-5 flex items-start gap-3 hover:border-destructive/40 transition">
          <Trash2 className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Delete account</div>
            <div className="text-sm text-muted-foreground">Permanently remove your data.</div>
          </div>
        </Link>
      </div>

      <h2 className="mt-12 text-2xl font-semibold">FAQ</h2>
      <div className="mt-4 space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="glass-card rounded-2xl p-5 group">
            <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
              {f.q}
              <span className="text-muted-foreground group-open:rotate-180 transition">⌄</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
