"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ContactPopupCloseReason,
  ContactPopupErrorType,
  trackContactPopupClosed,
  trackContactPopupShown,
  trackContactPopupSubmittedError,
  trackContactPopupSubmittedSuccess,
} from "@/utils/contact-popup-analytics";

const SCROLL_THRESHOLD = 100;
const VISIBLE_DURATION_MS = 10000;
const SESSION_FLAG_KEY = "contactPopup_shown_session";

function isSessionFlagSet(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function setSessionFlag() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_FLAG_KEY, "1");
  } catch {
    // Ignore storage failures
  }
}

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "message", string>>;

interface BackendErrorResponse {
  error?: string;
  fieldErrors?: FieldErrors;
}

export function HomeContactPopupController() {
  const pathname = usePathname();
  const [isEligible, setIsEligible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [hasCrossedScrollThreshold, setHasCrossedScrollThreshold] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const [visibleTimerId, setVisibleTimerId] = useState<number | null>(null);

  const isHomepage = pathname === "/";

  const clearVisibleTimer = useCallback(() => {
    if (visibleTimerId !== null) {
      window.clearTimeout(visibleTimerId);
    }
  }, [visibleTimerId]);

  const startVisibleTimer = useCallback(
    (durationMs: number) => {
      if (typeof window === "undefined") return;
      if (isSessionFlagSet()) return;

      clearVisibleTimer();
      const id = window.setTimeout(() => {
        setIsEligible(true);
        setIsOpen(true);
        setSessionFlag();
        trackContactPopupShown();
      }, durationMs);
      setVisibleTimerId(id);
    },
    [clearVisibleTimer]
  );

  // Scroll listener — once user has scrolled more than threshold, start timer
  useEffect(() => {
    if (!isHomepage) return;
    if (typeof window === "undefined") return;
    if (isSessionFlagSet()) return;
    if (hasCrossedScrollThreshold) return;

    const handleScroll = () => {
      if (window.scrollY > SCROLL_THRESHOLD && !hasCrossedScrollThreshold) {
        setHasCrossedScrollThreshold(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hasCrossedScrollThreshold, isHomepage]);

  // Start timer once threshold crossed
  useEffect(() => {
    if (!isHomepage) return;
    if (typeof window === "undefined") return;
    if (isSessionFlagSet()) return;

    if (!hasCrossedScrollThreshold) return;

    setRemainingMs(VISIBLE_DURATION_MS);
  }, [hasCrossedScrollThreshold, isHomepage]);

  // Handle visibility changes for timer pause/resume
  useEffect(() => {
    if (!isHomepage) return;
    if (typeof document === "undefined") return;
    if (isSessionFlagSet()) return;

    if (remainingMs === null) return;

    let lastVisibleStart = document.visibilityState === "visible" ? performance.now() : null;

    const handleVisibilityChange = () => {
      if (isSessionFlagSet()) return;

      if (document.visibilityState === "hidden") {
        if (lastVisibleStart != null) {
          const elapsed = performance.now() - lastVisibleStart;
          const nextRemaining = Math.max(0, remainingMs - elapsed);
          setRemainingMs(nextRemaining);
          clearVisibleTimer();
          lastVisibleStart = null;
        }
      } else if (document.visibilityState === "visible") {
        lastVisibleStart = performance.now();
        if (remainingMs > 0) {
          startVisibleTimer(remainingMs);
        }
      }
    };

    // When remainingMs is set for the first time, start the timer if visible
    if (document.visibilityState === "visible" && remainingMs > 0) {
      lastVisibleStart = performance.now();
      startVisibleTimer(remainingMs);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearVisibleTimer();
    };
  }, [clearVisibleTimer, isHomepage, remainingMs, startVisibleTimer]);

  const handleClose = useCallback(
    (reason: ContactPopupCloseReason) => {
      if (!isOpen) return;
      setIsOpen(false);
      setSessionFlag();
      trackContactPopupClosed(reason);
      clearVisibleTimer();
    },
    [clearVisibleTimer, isOpen]
  );

  if (!isHomepage) return null;
  if (!isEligible && !isOpen) return null;
  if (isSessionFlagSet() && !isOpen) return null;

  return (
    <ContactPopup
      open={isOpen}
      onClose={handleClose}
    />
  );
}

interface ContactPopupProps {
  open: boolean;
  onClose: (reason: ContactPopupCloseReason) => void;
}

function ContactPopup({ open, onClose }: ContactPopupProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [autoCloseId, setAutoCloseId] = useState<number | null>(null);

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 640;
  }, []);

  const resetAutoClose = useCallback(() => {
    if (autoCloseId !== null) {
      window.clearTimeout(autoCloseId);
    }
  }, [autoCloseId]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onClose("closeButton");
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) {
      resetAutoClose();
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose("escKey");
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, open, resetAutoClose]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!name.trim()) {
      errors.name = "Name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Enter a valid email";
    }

    if (!message.trim()) {
      errors.message = "Message is required";
    } else if (message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters";
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          message: message.trim(),
          source_page: "homepage_popup",
          honeypot,
        }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          const data: BackendErrorResponse = await response.json().catch(() => ({}));
          if (data.fieldErrors) {
            setFieldErrors(data.fieldErrors);
          }
          if (data.error) {
            setFormError(data.error);
          }
          setIsSubmitting(false);
          return;
        }

        const errorType: ContactPopupErrorType = response.status >= 500 ? "server5xx" : "network";
        trackContactPopupSubmittedError(errorType);
        setFormError("We couldn't send your message. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setHoneypot("");
      setFieldErrors({});
      trackContactPopupSubmittedSuccess();

      const id = window.setTimeout(() => {
        onClose("closeButton");
      }, 3000);
      setAutoCloseId(id);
    } catch {
      trackContactPopupSubmittedError("network");
      setFormError("We couldn't send your message. Please try again.");
      setIsSubmitting(false);
    }
  };

  const desktopContentClassName =
    "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg";

  const mobileContentClassName =
    "fixed inset-x-0 bottom-0 top-0 z-50 grid w-full bg-background p-6 shadow-lg outline-none sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={isMobile ? mobileContentClassName : desktopContentClassName}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Have questions?
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Leave your details and our team will contact you shortly.
          </p>
        </DialogHeader>

        {formError && (
          <div
            role="alert"
            className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        {isSuccess ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Thanks, we've received your message.</p>
            <p>We'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone (optional)</Label>
              <Input
                id="contact-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-destructive">{fieldErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                required
              />
              {fieldErrors.message && (
                <p className="text-xs text-destructive">{fieldErrors.message}</p>
              )}
            </div>

            {/* Honeypot field for spam protection */}
            <div className="hidden">
              <Label htmlFor="contact-company">Company</Label>
              <Input
                id="contact-company"
                autoComplete="off"
                tabIndex={-1}
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
