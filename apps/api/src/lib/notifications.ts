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

  return { id: result.data.id };
}
