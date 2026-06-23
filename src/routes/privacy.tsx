import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — NextCareer" },
      { name: "description", content: "How NextCareer collects, uses and protects your data." },
      { property: "og:title", content: "Privacy Policy — NextCareer" },
      { property: "og:url", content: "https://nextcareer.one/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://nextcareer.one/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 prose prose-invert">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="font-display text-4xl font-bold mt-4">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="mt-8 text-2xl font-semibold">What we collect</h2>
      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
        <li><strong>Account data</strong>: email, name, and password (stored hashed by our auth provider).</li>
        <li><strong>Career data you provide</strong>: CV text, cover letters, job descriptions, interview answers, applications you save.</li>
        <li><strong>Usage data</strong>: which AI tools you run and how often, so we can enforce free-plan limits and improve the product.</li>
        <li><strong>Payment data</strong>: handled by our payment processor (PayFast). We store the transaction status, amount and reference — never your card number.</li>
        <li><strong>Device tokens</strong> (if you enable notifications): a push token that lets us deliver reminders to your device.</li>
      </ul>

      <h2 className="mt-8 text-2xl font-semibold">How we use it</h2>
      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
        <li>To provide the service you signed up for (generate CVs, cover letters, match scores, etc.).</li>
        <li>To process payments and manage your subscription.</li>
        <li>To send transactional emails and, if you opt in, reminders about your job search.</li>
        <li>To detect abuse and keep the service running reliably.</li>
      </ul>

      <h2 className="mt-8 text-2xl font-semibold">AI processing</h2>
      <p className="text-muted-foreground">
        When you use an AI tool, the relevant text (your CV, the job description, your answer)
        is sent to our AI providers strictly to generate your result. We do not use your content
        to train third-party models.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Sharing</h2>
      <p className="text-muted-foreground">
        We don't sell your data. We share it only with the processors needed to run the service
        (hosting, authentication, AI generation, payments) under contracts that bind them to use it
        only for that purpose.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Retention & deletion</h2>
      <p className="text-muted-foreground">
        You can delete your account at any time from{" "}
        <Link className="text-primary-glow" to="/delete-account">/delete-account</Link>. We remove
        your profile, applications, generated packs, usage history and push tokens. Anonymised
        payment records are kept where law requires.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Your rights</h2>
      <p className="text-muted-foreground">
        You can request a copy or correction of your data, withdraw consent, or lodge a complaint
        with your local data-protection authority. Contact us via{" "}
        <Link className="text-primary-glow" to="/support">/support</Link>.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Children</h2>
      <p className="text-muted-foreground">NextCareer is not intended for children under 16.</p>

      <h2 className="mt-8 text-2xl font-semibold">Changes</h2>
      <p className="text-muted-foreground">
        If we materially change this policy we'll notify you in-app or by email before the change
        takes effect.
      </p>
    </article>
  );
}
