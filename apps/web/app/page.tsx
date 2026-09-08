import Link from "next/link";
import { LedgerDemo } from "@/components/ledger-demo";

const repo = "https://github.com/clipinfit/convex-credits";
export default function Home() {
  return (
    <div className="landing">
      <header className="masthead">
        <Link className="wordmark" href="/">
          ◈ <span>convex-credits</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/docs">Documentation</Link>
          <a href={repo}>GitHub ↗</a>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div>
            <Link className="release" href="/docs/release-status">
              <span className="dot" /> Stable · 1.0.0
            </Link>
            <p className="eyebrow">A CONVEX COMPONENT BY CLIPIN</p>
            <h1>
              Every charge.
              <br />
              <em>Accounted for.</em>
            </h1>
            <p className="intro">
              Credit balances for work that takes time. Reserve before a job
              starts. Complete when it succeeds. Return credits when it fails.
            </p>
            <div className="actions">
              <Link className="primary" href="/docs/getting-started">
                Read the docs <span>↗</span>
              </Link>
              <a className="secondary" href={repo}>
                Explore the source
              </a>
            </div>
            <p className="small">
              Open source · Apache-2.0 · Runs inside Convex
            </p>
          </div>
          <LedgerDemo />
        </section>
        <section className="principles" aria-label="Component guarantees">
          <article>
            <span>01 / RETRIES</span>
            <h2>Same request. Same result.</h2>
            <p>
              A repeated operation key returns its original result. A changed
              request with the same key fails.
            </p>
          </article>
          <article>
            <span>02 / ACCOUNTING</span>
            <h2>Completion costs zero extra.</h2>
            <p>
              A successful job has one debit. Its status changes without adding
              another credit movement.
            </p>
          </article>
          <article>
            <span>03 / OWNERSHIP</span>
            <h2>Your rules. One balance.</h2>
            <p>
              Your app sets prices and verifies payments. The component controls
              balance changes and charge transitions.
            </p>
          </article>
        </section>
        <section className="integration">
          <div>
            <p className="eyebrow">SMALL API. EXPLICIT OUTCOMES.</p>
            <h2>
              Give every job
              <br />a charge ID.
            </h2>
            <p>
              Use the same charge throughout your workflow. Keep pricing and
              provider calls in your app.
            </p>
            <Link href="/docs/lifecycle">Understand the lifecycle ↗</Link>
          </div>
          <pre>
            <code>{`const charge = await credits.reserve(ctx, {
  owner: userId,
  amount: 10,
  key: requestId,
  reason: "Image generation",
  reference: jobId,
});

// After the job succeeds, in a mutation:
await credits.complete(ctx, {
  chargeId: charge.chargeId,
  key: requestId + ":complete",
});`}</code>
          </pre>
        </section>
      </main>
      <footer>
        <span>
          Built and maintained by{" "}
          <a href="https://github.com/clipinfit">CLIPIN ↗</a>
        </span>
        <Link href="/docs/release-status">Release status</Link>
        <a href={repo}>Source & license ↗</a>
      </footer>
    </div>
  );
}
