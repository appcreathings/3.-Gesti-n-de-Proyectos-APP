import { integrationDb } from "@/storage/integration-db";

export interface EmailConfig {
  proxyUrl: string;
  fromEmail: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
}

export async function sendEmailViaAppsScript(
  config: EmailConfig,
  email: EmailPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(config.proxyUrl, {
      method: "POST",
      body: JSON.stringify({
        ...email,
        from: email.from ?? config.fromEmail,
      }),
      headers: { "Content-Type": "text/plain" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Email proxy error: ${response.status} ${response.statusText}`,
      };
    }

    await logEmailDelivery(config.proxyUrl, email, null);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logEmailDelivery(config.proxyUrl, email, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function logEmailDelivery(
  _proxyUrl: string,
  email: EmailPayload,
  error: string | null
): Promise<void> {
  await integrationDb.syncLogs.add({
    id: crypto.randomUUID(),
    direction: "outbound",
    provider: "email",
    eventType: "email.send",
    status: error ? "error" : "success",
    requestPayload: JSON.stringify({ to: email.to, subject: email.subject }).slice(0, 10_000),
    responsePayload: error ?? "",
    httpStatus: error ? null : 200,
    errorMessage: error,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });
}
