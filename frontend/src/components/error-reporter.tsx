"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/** Listens for uncaught errors and promise rejections in the browser and reports them. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // ignore noise from browser extensions and cross-origin scripts
      if (!e.filename || e.filename.startsWith(window.location.origin)) reportError(e.error ?? e.message);
    };
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
