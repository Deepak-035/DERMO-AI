
import { useState } from "react";

interface DownloadReportButtonProps {
  reportId?: number;
  reportDownloadUrl?: string;
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

export default function DownloadReportButton({
  reportId,
  reportDownloadUrl,
}: DownloadReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    const path =
      reportDownloadUrl ??
      (reportId ? `/reports/${reportId}/download` : undefined);

    if (!path) {
      setError("Report download information is unavailable.");
      return;
    }

    // Accept only a path on our configured backend.
    if (!path.startsWith("/") || path.startsWith("//")) {
      setError("Invalid report download URL.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "GET",
        headers: {
          Accept: "application/pdf",
        },
        // Add your authentication header here when login is implemented.
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("You are not authorized to download this report.");
        }

        if (response.status === 404) {
          throw new Error("Report not found.");
        }

        if (response.status === 501) {
          throw new Error(
            "Report downloads are not enabled yet. Please try again later."
          );
        }

        throw new Error("Unable to download the report. Please try again.");
      }

      const blob = await response.blob();

      if (blob.size === 0 || blob.type !== "application/pdf") {
        throw new Error("The server did not return a valid PDF.");
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `DERMO-AI-Report-${reportId ?? "report"}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>

<button
  type="button"
  onClick={handleDownload}
  disabled={loading || (!reportId && !reportDownloadUrl)}
  className="
    inline-flex items-center justify-center gap-2
    rounded-xl border border-cyan-300/60
    bg-gradient-to-r from-cyan-600 to-blue-600
    px-6 py-3
    text-sm font-semibold text-white
    shadow-lg shadow-cyan-500/20
    transition-all duration-300
    hover:from-cyan-500 hover:to-blue-500
    hover:border-cyan-200
    hover:shadow-xl hover:shadow-cyan-400/30
    hover:-translate-y-0.5
    active:translate-y-0
    disabled:cursor-not-allowed
    disabled:opacity-50
    disabled:hover:translate-y-0
  "
>
  {loading ? (
    <>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      Preparing PDF...
    </>
  ) : (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
      Download PDF Report
    </>
  )}
</button>


      {error && <p role="alert">{error}</p>}
    </div>
  );
}
