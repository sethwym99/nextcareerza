import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — NextCareer" },
      { name: "description", content: "The rules for using NextCareer." },
      { property: "og:title", content: "Terms of Service — NextCareer" },
      { property: "og:url", content: "https://nextcareer.one/terms" },
    ],
    links: [{ rel: "canonical", href: "https://nextcareer.one/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 prose prose-invert">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="font-display text-4xl font-bold mt-4">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="mt-8 text-2xl font-semibold">1. The service</h2>
      <p className="text-muted-foreground">
        NextCareer provides AI-powered career tools (CV writing, cover letters, job matching,
        interview practice, application tracking). The service is provided "as is" — outputs are
        AI-generated and you are responsible for reviewing them before sending to employers.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">2. Accounts</h2>
      <p className="text-muted-foreground">
        You must be 16+ and provide accurate information. You're responsible for activity on your
        account and for keeping your password safe.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">3. Acceptable use</h2>
      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
        <li>No misuse of the AI tools to generate harassment, deception, or illegal content.</li>
        <li>No attempts to bypass usage limits, reverse-engineer the service, or scrape data.</li>
        <li>You own your inputs; you grant us a limited licence to process them to deliver the service.</li>
      </ul>

      <h2 className="mt-8 text-2xl font-semibold">4. Subscriptions & refunds</h2>
      <p className="text-muted-foreground">
        Premium is billed monthly via PayFast. You may cancel at any time from{" "}
        <Link className="text-primary-glow" to="/billing">/billing</Link>; access continues until the
        end of the paid period. We don't offer pro-rata refunds for the current month except where
        required by law.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">5. Termination</h2>
      <p className="text-muted-foreground">
        You can delete your account at{" "}
        <Link className="text-primary-glow" to="/delete-account">/delete-account</Link>. We may
        suspend accounts that violate these terms.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">6. Disclaimers</h2>
      <p className="text-muted-foreground">
        NextCareer does not guarantee employment outcomes. AI outputs may contain errors. Salary
        estimates are informational only.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">7. Liability</h2>
      <p className="text-muted-foreground">
        To the maximum extent permitted by law, our total liability is limited to the amount you
        paid us in the 12 months before the claim.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">8. Changes</h2>
      <p className="text-muted-foreground">
        We may update these terms. Continued use after notice constitutes acceptance.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">9. Contact</h2>
      <p className="text-muted-foreground">
        Questions? <Link className="text-primary-glow" to="/support">/support</Link>.
      </p>
    </article>
  );
}
