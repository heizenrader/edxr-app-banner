import {
  detectPlatform,
  isIosSafari,
  EDXR_TARGETS,
  checkInstalled,
  getDismissed,
  setDismissed,
} from "./core";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1",
  ipad:
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  // iPadOS "Request Desktop Site" masquerades as a Mac; touch points reveal it.
  ipadDesktopUA:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.81 Mobile Safari/537.36",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
  googlebot:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/125.0.0.0 Safari/537.36",
};

describe("detectPlatform", () => {
  it.each([
    [UA.iphoneSafari, 5, "ios"],
    [UA.iphoneChrome, 5, "ios"],
    [UA.ipad, 5, "ios"],
    [UA.ipadDesktopUA, 5, "ios"], // Mac UA + touch = iPadOS
    [UA.macSafari, 0, "macos"],
    [UA.macChrome, 0, "macos"],
    [UA.windowsChrome, 0, "windows"],
    [UA.androidChrome, 5, "android"],
    [UA.linuxFirefox, 0, "other"],
    [UA.googlebot, 0, "other"],
  ] as const)("ua=%s touch=%d -> %s", (ua, touch, expected) => {
    expect(detectPlatform(ua, touch)).toBe(expected);
  });

  it("defaults maxTouchPoints to 0 (Mac UA stays macos)", () => {
    expect(detectPlatform(UA.macSafari)).toBe("macos");
  });
});

describe("isIosSafari", () => {
  it("is true for real Safari on iPhone/iPad, incl. iPadOS desktop UA", () => {
    expect(isIosSafari(UA.iphoneSafari, 5)).toBe(true);
    expect(isIosSafari(UA.ipad, 5)).toBe(true);
    expect(isIosSafari(UA.ipadDesktopUA, 5)).toBe(true);
  });

  it("is false for other browsers on iOS and for non-iOS Safari", () => {
    expect(isIosSafari(UA.iphoneChrome, 5)).toBe(false); // CriOS
    expect(isIosSafari(UA.macSafari, 0)).toBe(false); // desktop Safari
    expect(isIosSafari(UA.androidChrome, 5)).toBe(false);
  });
});

describe("EDXR_TARGETS", () => {
  it("has the exact registry values", () => {
    expect(EDXR_TARGETS.ios).toEqual({
      href: "https://apps.apple.com/us/app/educationxr/id1479104639",
      label: "Get the EducationXR app",
    });
    expect(EDXR_TARGETS.android).toEqual({
      href: "https://play.google.com/store/apps/details?id=com.heizenrader.educationxr",
      label: "Get the EducationXR app",
    });
    expect(EDXR_TARGETS.macos).toEqual({
      href: "https://apps.apple.com/us/app/educationxr/id1479104639",
      label: "Get EducationXR for Mac",
    });
    expect(EDXR_TARGETS.windows).toEqual({
      href: "https://admin.educationxr.com/download/links",
      label: "Get EducationXR for Windows",
    });
    expect(EDXR_TARGETS.other).toBeNull();
  });
});

describe("checkInstalled", () => {
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).getInstalledRelatedApps;
  });

  it("resolves false when the API is absent", async () => {
    await expect(checkInstalled()).resolves.toBe(false);
  });

  it("resolves true when a related app is reported", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).getInstalledRelatedApps = async () => [{ platform: "play" }];
    await expect(checkInstalled()).resolves.toBe(true);
  });

  it("resolves false when the API throws", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).getInstalledRelatedApps = async () => {
      throw new Error("nope");
    };
    await expect(checkInstalled()).resolves.toBe(false);
  });
});

describe("dismissal", () => {
  beforeEach(() => sessionStorage.clear());

  it("round-trips through sessionStorage", () => {
    expect(getDismissed()).toBe(false);
    setDismissed();
    expect(getDismissed()).toBe(true);
    expect(sessionStorage.getItem("eab-dismissed")).toBe("1");
  });

  it("fails closed when storage throws (private mode)", () => {
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    expect(getDismissed()).toBe(false);
    spy.mockRestore();
  });
});

import { APP_SCHEME_URL } from "./core";

describe("APP_SCHEME_URL", () => {
  it("is the app-scheme home entry point", () => {
    expect(APP_SCHEME_URL).toBe("edxr://");
  });
});
