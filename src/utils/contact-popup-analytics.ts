"use client";

// Lightweight analytics wrapper for contact popup events.
// This uses window.dataLayer or window.gtag if available, but
// fails silently so it never blocks UI behaviour.

export type DeviceType = "desktop" | "tablet" | "mobile";

export type ContactPopupCloseReason =
  | "closeButton"
  | "backdropClick"
  | "escKey"
  | "mobileBack";

export type ContactPopupErrorType = "network" | "server5xx";

function getPageUrl() {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function getDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function emit(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const data = {
    event,
    ...payload,
  };

  try {
    const w = window as typeof window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };

    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push(data);
      return;
    }

    if (typeof w.gtag === "function") {
      w.gtag("event", event, payload);
    }
  } catch {
    // Swallow analytics errors
  }
}

export function trackContactPopupShown() {
  emit("contactPopup_shown", {
    pageUrl: getPageUrl(),
    deviceType: getDeviceType(),
  });
}

export function trackContactPopupClosed(reason: ContactPopupCloseReason) {
  emit("contactPopup_closed", {
    pageUrl: getPageUrl(),
    closeReason: reason,
  });
}

export function trackContactPopupSubmittedSuccess() {
  emit("contactPopup_submitted_success", {
    pageUrl: getPageUrl(),
  });
}

export function trackContactPopupSubmittedError(errorType: ContactPopupErrorType) {
  emit("contactPopup_submitted_error", {
    pageUrl: getPageUrl(),
    errorType,
  });
}
