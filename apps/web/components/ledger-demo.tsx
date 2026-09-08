"use client";
import { useState } from "react";

type State = "ready" | "pending" | "completed" | "released";
export function LedgerDemo() {
  const [state, setState] = useState<State>("ready");
  const [retry, setRetry] = useState(false);
  const balance = state === "pending" || state === "completed" ? 10 : 20;
  return (
    <div className="demo">
      <div className="demo-heading">
        <span>THE CREDIT LIFECYCLE</span>
        <span className="tag">SIMULATION</span>
      </div>
      <div className="balance">
        <span>Available credits</span>
        <strong aria-live="polite">
          {balance}
          <small> cr</small>
        </strong>
        <div className="balance-track">
          <div style={{ width: `${balance * 5}%` }} />
        </div>
      </div>
      <div className="ledger">
        <div className="ledger-heading">
          <span>Movement</span>
          <span>Credits</span>
        </div>
        <div className="ledger-row">
          <span>Welcome credits</span>
          <b className="positive">+20</b>
        </div>
        {state !== "ready" && (
          <div className="ledger-row">
            <span>
              Image generation <small>{state}</small>
            </span>
            <b>−10</b>
          </div>
        )}
        {state === "released" && (
          <div className="ledger-row">
            <span>Job failed · credits returned</span>
            <b className="positive">+10</b>
          </div>
        )}
      </div>
      <div className="demo-actions">
        {state === "ready" ? (
          <button type="button" onClick={() => setState("pending")}>
            Reserve 10 credits →
          </button>
        ) : state === "pending" ? (
          <>
            <button type="button" onClick={() => setState("completed")}>
              Complete job
            </button>
            <button
              type="button"
              className="quiet"
              onClick={() => setState("released")}
            >
              Fail job
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setRetry(true)}>
              Retry callback
            </button>
            <button
              type="button"
              className="quiet"
              onClick={() => {
                setState("ready");
                setRetry(false);
              }}
            >
              Reset
            </button>
          </>
        )}
      </div>
      <p className="demo-note" aria-live="polite">
        {retry
          ? "Same operation key. No additional credit movement."
          : state === "completed"
            ? "Completed. One job, one debit. No zero-value row."
            : state === "released"
              ? "Released. The original debit and refund sum to zero."
              : state === "pending"
                ? "Credits are reserved while the job runs."
                : "Try a successful job, a failure, or a repeated callback."}
      </p>
      <p className="simulation-note">
        Browser simulation. No account or real credits are used.
      </p>
    </div>
  );
}
