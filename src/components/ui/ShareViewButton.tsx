import { useCallback, useEffect, useState } from "react";
import { FiCheck, FiLink } from "react-icons/fi";

// Copy the current URL to the clipboard with brief visual confirmation.
//
// The Webcam multiview route already encodes its layout in the path
// (e.g. /webcams/m/yongpyong~cam-1/vivaldi~cam-3), so the URL alone is
// a complete shareable description. This button exposes that affordance
// rather than relying on users finding it.
//
// Falls back gracefully when the Clipboard API isn't available (older
// Safari, non-HTTPS contexts): selects the URL in a hidden textarea so
// the user can copy it manually.
type Props = {
  className?: string;
  label?: string;
  copiedLabel?: string;
};

export function ShareViewButton({
  className = "",
  label = "Copy link",
  copiedLabel = "Copied!",
}: Props) {
  const [copied, setCopied] = useState(false);

  // Reset the "Copied!" badge after a short delay so users can re-share
  // by clicking again.
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-clipboard-API contexts (rare on modern HTTPS
        // browsers, but no harm in keeping a graceful path).
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
    } catch {
      // If the user denied clipboard access, silently fail.
      // They can still copy the URL from the address bar.
    }
  }, []);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className={[
        "inline-flex items-center gap-2 rounded-md border border-slate-200/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800",
        className,
      ].join(" ")}
    >
      {copied ? (
        <>
          <FiCheck className="h-4 w-4 text-emerald-500" aria-hidden />
          {copiedLabel}
        </>
      ) : (
        <>
          <FiLink className="h-4 w-4" aria-hidden />
          {label}
        </>
      )}
    </button>
  );
}
