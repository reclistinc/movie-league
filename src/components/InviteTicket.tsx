"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";

const noopSubscribe = () => () => {};

/**
 * A small shimmering gold movie ticket labelled INVITE (sits in a header). Tap it and it flips
 * over with a burst of sparkles to reveal the invite code with Copy and Share. Tap again to flip back.
 */
export function InviteLink({ code, leagueName }: { code: string; leagueName?: string }) {
  const [flipped, setFlipped] = useState(false);
  const [burst, setBurst] = useState(0); // bump to replay the sparkle burst
  const [copied, setCopied] = useState(false);
  // Same answer on server and first client render (false), then the real one — no hydration mismatch.
  const canShare = useSyncExternalStore(noopSubscribe, () => typeof navigator.share === "function", () => false);
  const url = () => `${window.location.origin}/?join=${code}`;
  const name = leagueName ?? "Movie League";

  const flip = () => {
    setFlipped((f) => !f);
    setBurst((b) => b + 1);
  };

  return (
    <div className="invite-scene shrink-0" onClick={(e) => e.stopPropagation()}>
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Invite ticket — tap to flip back" : "Invite ticket — tap to reveal the invite"}
        onClick={flip}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), flip())}
        className={`invite-card ${flipped ? "is-flipped" : ""}`}
      >
        {/* FRONT: tiny gold ticket */}
        <div className="invite-face invite-front">
          <span className="invite-shine" aria-hidden />
          <span className="invite-notch left" aria-hidden />
          <span className="invite-notch right" aria-hidden />
          <div className="invite-stub" aria-hidden>
            ✦
          </div>
          <div className="invite-main">
            <div className="display text-[22px] leading-none tracking-[0.14em]">INVITE</div>
          </div>
          {[20, 82].map((left, i) => (
            <span key={i} className="invite-sparkle" style={{ left: `${left}%`, top: `${[18, 58][i]}%`, animationDelay: `${i * 0.6}s` }} aria-hidden>
              ✦
            </span>
          ))}
        </div>

        {/* BACK: code + copy + share */}
        <div className="invite-face invite-back">
          <span className="mono text-[11px] tracking-[0.08em]" style={{ color: "var(--marquee-gold)" }}>
            {code}
          </span>
          <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Copy invite link"
              title="Copy invite link"
              onClick={() => {
                navigator.clipboard?.writeText(url());
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="btn-primary flex h-[26px] w-[26px] items-center justify-center p-0"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            {canShare && (
              <button
                type="button"
                aria-label="Share invite"
                title="Share invite"
                onClick={() => navigator.share({ title: name, text: `Join ${name} on Movie League!`, url: url() }).catch(() => {})}
                className="btn-ghost flex h-[26px] w-[26px] items-center justify-center p-0"
              >
                <Share2 size={13} />
              </button>
            )}
          </span>
        </div>
      </div>

      {/* Sparkle burst on every flip */}
      {burst > 0 && (
        <div key={burst} className="invite-burst" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 26 + (i % 3) * 10;
            return (
              <span
                key={i}
                style={
                  {
                    "--dx": `${Math.cos(angle) * dist * 2.2}px`,
                    "--dy": `${Math.sin(angle) * dist}px`,
                    animationDelay: `${(i % 4) * 0.04}s`,
                    color: ["#f9e27a", "#fff", "#f0b429"][i % 3],
                  } as React.CSSProperties
                }
              >
                ✦
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
