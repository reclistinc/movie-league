"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";

const noopSubscribe = () => () => {};

/**
 * A shimmering gold movie ticket labelled INVITE. Tap it and it flips over with a burst of
 * sparkles to reveal the invite code, Copy link and Share. Tap the ticket again to flip back.
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
    <div className="invite-scene mt-4">
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Invite ticket — tap to flip back" : "Invite ticket — tap to reveal the invite"}
        onClick={flip}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), flip())}
        className={`invite-card ${flipped ? "is-flipped" : ""}`}
      >
        {/* FRONT: the gold ticket */}
        <div className="invite-face invite-front">
          <span className="invite-shine" aria-hidden />
          <span className="invite-notch left" aria-hidden />
          <span className="invite-notch right" aria-hidden />
          <div className="invite-stub mono">
            <span>ADMIT</span>
            <span>ONE</span>
          </div>
          <div className="invite-main">
            <div className="mono text-[10px] tracking-[0.35em]">✦ YOU&apos;RE HOLDING AN ✦</div>
            <div className="display text-[44px] leading-none tracking-[0.12em]">INVITE</div>
            <div className="mono truncate text-[10px] tracking-[0.2em] uppercase">to {name}</div>
          </div>
          <div className="invite-tap mono">tap to reveal</div>
          {[12, 30, 58, 77, 90].map((left, i) => (
            <span key={i} className="invite-sparkle" style={{ left: `${left}%`, top: `${[22, 70, 18, 64, 30][i]}%`, animationDelay: `${i * 0.35}s` }} aria-hidden>
              ✦
            </span>
          ))}
        </div>

        {/* BACK: the code + actions */}
        <div className="invite-face invite-back">
          <div className="text-center">
            <div className="label text-[10px]">Invite code</div>
            <div className="mono text-2xl tracking-[0.18em]" style={{ color: "var(--marquee-gold)" }}>
              {code}
            </div>
          </div>
          <div className="mt-2.5 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(url());
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}
            </button>
            {canShare && (
              <button
                type="button"
                onClick={() => navigator.share({ title: name, text: `Join ${name} on Movie League!`, url: url() }).catch(() => {})}
                className="btn-ghost flex items-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap"
              >
                <Share2 size={14} /> Share
              </button>
            )}
          </div>
          <div className="mono mt-2 text-center text-[10px]" style={{ color: "var(--reel-grey)" }}>
            tap the ticket to flip it back
          </div>
        </div>
      </div>

      {/* Sparkle burst on every flip */}
      {burst > 0 && (
        <div key={burst} className="invite-burst" aria-hidden>
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * Math.PI * 2;
            const dist = 70 + (i % 3) * 28;
            return (
              <span
                key={i}
                style={
                  {
                    "--dx": `${Math.cos(angle) * dist * 1.8}px`,
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
