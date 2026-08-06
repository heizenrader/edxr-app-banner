import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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

export type AppBannerPlacement = "top" | "bottom";

export type AppBannerProps = {
  /** Override the link registry; defaults to the shared EducationXR targets. */
  targets?: Record<Platform, BannerTarget | null>;
  /** App icon rendered at the left (48x48, rounded by the stylesheet). */
  icon?: ReactNode;
  /** "bottom" (default) or "top" (App-Store-banner style). A
   *  `?eab=top|bottom|off` query param overrides this at runtime for live
   *  comparison. */
  placement?: AppBannerPlacement;
  /** Hide on scroll down / reveal on scroll up. Defaults to true for top
   *  placement (Apple's behavior), false (pinned) for bottom. A
   *  `?eabhide=1|0` query param overrides at runtime. */
  autoHide?: boolean;
  /** Bold first line. */
  title?: string;
  /** Muted second line, App Store subtitle style. */
  subtitle?: string;
};

/**
 * Platform-aware "get the app" banner, Apple-banner visual language:
 * icon + title/subtitle + pill CTA + circular dismiss.
 *
 * Renders nothing on the server and the first client render. While visible it
 * reserves matching body padding (bottom or top) and broadcasts coordination
 * signals on <html> so the host page can move competing fixed widgets (e.g. a
 * cookie-consent badge) out of the way:
 *   html[data-eab-placement="top"|"bottom"][data-eab-visible] + --eab-h (px).
 */
export function AppBanner({
  targets = EDXR_TARGETS,
  icon,
  placement = "bottom",
  autoHide,
  title = "EducationXR",
  subtitle = "Immersive 3D learning platform",
}: AppBannerProps) {
  const [target, setTarget] = useState<BannerTarget | null>(null);
  const [livePlacement, setLivePlacement] = useState<AppBannerPlacement>(placement);
  const [liveAutoHide, setLiveAutoHide] = useState(false);
  const [hidden, setHidden] = useState(false); // auto-hide scroll state
  const barRef = useRef<HTMLDivElement | null>(null);

  // Decide whether/where to show, once, after mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const override = params.get("eab");
      if (override === "off") return;
      const resolved: AppBannerPlacement =
        override === "top" || override === "bottom" ? override : placement;
      const hideParam = params.get("eabhide");
      const resolvedAutoHide =
        hideParam === "1" ? true : hideParam === "0" ? false : (autoHide ?? resolved === "top");

      const ua = navigator.userAgent;
      const touch = navigator.maxTouchPoints ?? 0;
      const platform = detectPlatform(ua, touch);
      if (platform === "other") return;
      if (isIosSafari(ua, touch)) return; // native Smart App Banner territory
      if (getDismissed()) return;
      if (await checkInstalled()) return;
      if (alive) {
        setLivePlacement(resolved);
        setLiveAutoHide(resolvedAutoHide);
        setTarget(targets[platform]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [targets, placement, autoHide]);

  // Auto-hide: hide on scroll down, reveal on scroll up (rAF-throttled).
  useEffect(() => {
    if (!target || !liveAutoHide) return;
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 40) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      setHidden(false);
    };
  }, [target, liveAutoHide]);

  // Reserve space + broadcast coordination signals while visible. Pre-paint
  // (layout effect) so the bar never overlaps content for a frame, and a
  // ResizeObserver keeps the reservation in sync when the bar's height
  // changes (e.g. safe-area insets appearing when browser toolbars hide).
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!target || !bar) return;
    const root = document.documentElement;
    const side = livePlacement === "top" ? "paddingTop" : "paddingBottom";
    const prev = document.body.style[side];

    const apply = () => {
      const h = Math.ceil(bar.getBoundingClientRect().height);
      document.body.style[side] = `${h}px`;
      root.style.setProperty("--eab-h", `${h}px`);
    };

    root.dataset.eabPlacement = livePlacement;
    apply();

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(apply);
      observer.observe(bar);
    }
    return () => {
      observer?.disconnect();
      document.body.style[side] = prev;
      delete root.dataset.eabPlacement;
      delete root.dataset.eabVisible;
      root.style.removeProperty("--eab-h");
    };
  }, [target, livePlacement]);

  // Visibility signal tracks the top-mode scroll state so coordinated
  // widgets (and the host header) slide together with the bar.
  useEffect(() => {
    if (!target) return;
    const root = document.documentElement;
    if (hidden) delete root.dataset.eabVisible;
    else root.dataset.eabVisible = "1";
  }, [target, hidden]);

  if (!target) return null;

  const dismiss = () => {
    setDismissed();
    setTarget(null);
  };

  return (
    <div
      className={`eab-banner${hidden ? " eab-hidden" : ""}`}
      data-p={livePlacement}
      role="region"
      aria-label="Get the app"
      ref={barRef}
    >
      <div className="eab-row">
        {icon ? <span className="eab-icon">{icon}</span> : null}
        <span className="eab-text">
          <span className="eab-title">{title}</span>
          <span className="eab-sub">{subtitle}</span>
        </span>
        <a className="eab-cta" href={target.href} target="_blank" rel="noopener noreferrer">
          Get
        </a>
        <button className="eab-dismiss" type="button" aria-label="Dismiss" onClick={dismiss}>
          &#x2715;
        </button>
      </div>
    </div>
  );
}
