import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  EDXR_TARGETS,
  type BannerTarget,
  type Platform,
  checkInstalled,
  detectPlatform,
  getDismissed,
  isIosSafari,
  setDismissed,
} from "./core";

export type AppBannerProps = {
  /** Override the link registry; defaults to the shared EducationXR targets. */
  targets?: Record<Platform, BannerTarget | null>;
  /** Optional app icon rendered at the left of the bar. */
  icon?: ReactNode;
};

/**
 * Fixed bottom "get the app" bar. Renders nothing on the server and on the
 * first client render; after mount it decides whether to show. While shown it
 * reserves matching body padding-bottom so it never covers content and never
 * shifts anything above the fold (no CLS).
 */
export function AppBanner({ targets = EDXR_TARGETS, icon }: AppBannerProps) {
  const [target, setTarget] = useState<BannerTarget | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ua = navigator.userAgent;
      const touch = navigator.maxTouchPoints ?? 0;
      const platform = detectPlatform(ua, touch);
      if (platform === "other") return;
      if (isIosSafari(ua, touch)) return; // native Smart App Banner territory
      if (getDismissed()) return;
      if (await checkInstalled()) return;
      if (alive) setTarget(targets[platform]);
    })();
    return () => {
      alive = false;
    };
  }, [targets]);

  // Reserve space below the page content while the bar is visible.
  useEffect(() => {
    if (!target || !barRef.current) return;
    const h = barRef.current.getBoundingClientRect().height;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${Math.ceil(h)}px`;
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, [target]);

  if (!target) return null;

  const dismiss = () => {
    setDismissed();
    setTarget(null);
  };

  return (
    <div className="eab-banner" role="region" aria-label="Get the app" ref={barRef}>
      {icon ? <span className="eab-icon">{icon}</span> : null}
      <span className="eab-label">{target.label}</span>
      <a className="eab-cta" href={target.href} target="_blank" rel="noopener noreferrer">
        Get
      </a>
      <button className="eab-dismiss" type="button" aria-label="Dismiss" onClick={dismiss}>
        &#x2715;
      </button>
    </div>
  );
}
