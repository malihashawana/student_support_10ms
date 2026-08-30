type ResolutionEmailParams = {
  to: string;
  studentName: string;
  ticketNumber: string;
  title: string;
  officialResponse: string | null;
};

/**
 * Server-only. Never import this from a route component — it holds a secret
 * API key that must not reach the browser bundle.
 */
export async function sendResolutionEmail(params: ResolutionEmailParams): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM_EMAIL"];
  if (!apiKey || !from) {
    throw new Error("Email is not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL).");
  }

  const appUrl = (process.env["APP_URL"] || "").replace(/\/$/, "");
  const dashboardLink = appUrl ? `${appUrl}/student` : null;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <p>প্রিয় ${escapeHtml(params.studentName)},</p>
      <p>আপনার জানানো সমস্যা <strong>${escapeHtml(params.ticketNumber)}</strong> — "${escapeHtml(params.title)}" — সমাধান করা হয়েছে।</p>
      ${
        params.officialResponse
          ? `<p><strong>উত্তর:</strong><br/>${escapeHtml(params.officialResponse).replace(/\n/g, "<br/>")}</p>`
          : ""
      }
      ${dashboardLink ? `<p><a href="${dashboardLink}">ড্যাশবোর্ডে দেখতে এখানে ক্লিক করুন</a></p>` : ""}
      <p style="color: #6b7280; font-size: 12px;">এইচএসসি ২৮ স্টুডেন্ট সাপোর্ট হাব</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: `আপনার সমস্যা সমাধান হয়েছে — ${params.ticketNumber}`,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend API error (${response.status}): ${detail.slice(0, 300)}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
