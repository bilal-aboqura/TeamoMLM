"use client";

/**
 * Client-side date formatter component.
 *
 * Server Components run on the Docker host (UTC), so any call to
 * `new Date().toLocaleDateString()` inside them uses UTC — which is
 * wrong for end-users in different timezones.
 *
 * This component defers formatting to the *browser*, where the
 * runtime timezone matches the user's device settings.
 *
 * It also handles hydration mismatch by rendering a non-breaking
 * space during SSR and filling in the formatted date on mount.
 */

import { useEffect, useState } from "react";

type Props = {
  /** ISO 8601 timestamp string (e.g. from Supabase TIMESTAMPTZ) */
  iso: string;
  /** Intl.DateTimeFormat options */
  options?: Intl.DateTimeFormatOptions;
  /** BCP-47 locale tag. Defaults to "ar" */
  locale?: string;
  /** Optional CSS class */
  className?: string;
};

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

export function LocalDate({
  iso,
  options = DEFAULT_OPTIONS,
  locale = "ar",
  className,
}: Props) {
  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    try {
      setFormatted(new Date(iso).toLocaleDateString(locale, options));
    } catch {
      setFormatted(iso);
    }
  }, [iso, locale, options]);

  return <span className={className}>{formatted || "\u00A0"}</span>;
}

export function LocalDateTime({
  iso,
  options,
  locale = "ar",
  className,
}: Props) {
  const defaultOpts: Intl.DateTimeFormatOptions = options ?? {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };

  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    try {
      setFormatted(new Date(iso).toLocaleString(locale, defaultOpts));
    } catch {
      setFormatted(iso);
    }
  }, [iso, locale, defaultOpts]);

  return <span className={className}>{formatted || "\u00A0"}</span>;
}
