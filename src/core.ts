export type Platform = "ios" | "android" | "macos" | "windows" | "other";

export type BannerTarget = { href: string; label: string };

/**
 * Shared link registry — the single source of truth both EducationXR web
 * properties stay in sync through. One Apple listing covers iOS AND Mac.
 */
export const EDXR_TARGETS: Record<Platform, BannerTarget | null> = {
  ios: {
    href: "https://apps.apple.com/us/app/educationxr/id1479104639",
    label: "Get the EducationXR app",
  },
  android: {
    href: "https://play.google.com/store/apps/details?id=com.heizenrader.educationxr",
    label: "Get the EducationXR app",
  },
  macos: {
    href: "https://apps.apple.com/us/app/educationxr/id1479104639",
    label: "Get EducationXR for Mac",
  },
  windows: {
    href: "https://admin.educationxr.com/download/links",
    label: "Get EducationXR for Windows",
  },
  other: null,
};

/**
 * UA-based platform detection. iPadOS's "desktop site" mode sends a Mac UA;
 * a Mac that reports multitouch is actually an iPad.
 */
export function detectPlatform(ua: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPod|iPad/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh/.test(ua)) return maxTouchPoints > 1 ? "ios" : "macos";
  if (/Windows/.test(ua)) return "windows";
  return "other";
}

/**
 * True only for real Safari on iOS/iPadOS — where Apple's native Smart App
 * Banner shows and our custom banner must stay out of the way. Third-party
 * iOS browsers ship their own UA markers (CriOS/FxiOS/EdgiOS/OPiOS).
 */
export function isIosSafari(ua: string, maxTouchPoints = 0): boolean {
  if (detectPlatform(ua, maxTouchPoints) !== "ios") return false;
  if (!/Safari\//.test(ua)) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(ua);
}

type RelatedApp = { platform?: string; id?: string };

/**
 * Android Chrome's getInstalledRelatedApps — the only true install check.
 * Inert (always false) until Wave 2 ships the app-side association; guarded
 * so every other browser resolves false.
 */
export async function checkInstalled(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
    };
    if (typeof nav.getInstalledRelatedApps !== "function") return false;
    const apps = await nav.getInstalledRelatedApps();
    return apps.length > 0;
  } catch {
    return false;
  }
}

const DISMISS_KEY = "eab-dismissed";

export function getDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDismissed(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode — banner just reappears next page */
  }
}
