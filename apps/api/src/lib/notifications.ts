import { Resend } from "resend";
import { env } from "../env.js";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ id: string | null }> {
  const result = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { id: result.data?.id ?? null };
}

export async function sendAnnouncementEmail(params: {
  to: string;
  subject: string;
  title: string;
  description: string;
}): Promise<{ id: string | null }> {
  const result = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: buildAnnouncementHtml({ title: params.title, description: params.description }),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { id: result.data?.id ?? null };
}

function buildAnnouncementHtml(vars: { title: string; description: string }): string {
  const escaped = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escaped(vars.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:Inter,Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#1a1d2e;border-radius:12px;border:1px solid #2d3154;padding:40px;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7c85c8;">
                Chapter Announcement
              </p>
              <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#e2e8f0;line-height:1.3;">
                ${escaped(vars.title)}
              </h1>
              <div style="border-top:1px solid #2d3154;margin-bottom:24px;"></div>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#a0aec0;white-space:pre-wrap;">
                ${escaped(vars.description)}
              </p>
              <div style="border-top:1px solid #2d3154;margin-top:32px;padding-top:20px;">
                <p style="margin:0;font-size:12px;color:#4a5568;">
                  You received this because you are a member of the Stellar Orbit Ambassador Program.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
