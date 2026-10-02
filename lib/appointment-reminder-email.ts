import "server-only";

import { BrevoClient } from "@getbrevo/brevo";

type ReminderEmail = {
	to: string;
	customerName: string;
	serviceName: string;
	employeeName: string;
	startTime: string;
	endTime: string;
	price: number | string | null;
};

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function siteUrl() {
	const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "").trim().replace(/\/$/, "");
	if (!raw) return "";
	return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

export async function sendAppointmentReminderEmail(reminder: ReminderEmail) {
	const apiKey = process.env.BREVO_API_KEY;
	const senderEmail = process.env.BREVO_SENDER_EMAIL;
	const mode = process.env.REMINDER_EMAIL_MODE ?? process.env.BREVO_EMAIL_MODE;
	if (!apiKey || !senderEmail || (mode !== "test" && mode !== "live")) return false;

	const recipient = mode === "test" ? process.env.BREVO_TEST_RECIPIENT?.trim() : reminder.to;
	if (!recipient) return false;
	const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Il salone";
	const date = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", dateStyle: "full" }).format(new Date(reminder.startTime));
	const formatTime = (value: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
	const price = reminder.price == null ? "Da definire in salone" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(reminder.price));
	const accountUrl = siteUrl() ? `${siteUrl()}/account/bookings` : "";
	const testNote = mode === "test" ? `<p style="font-size:13px;color:#666">Destinatario previsto: ${escapeHtml(reminder.to)}</p>` : "";
	const accountAction = accountUrl ? `<p style="margin:24px 0 0"><a href="${escapeHtml(accountUrl)}" style="display:inline-block;background:#6f929c;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">Apri area clienti</a></p>` : "";
	const htmlContent = `<!doctype html><html lang="it"><body style="margin:0;background:#f7f3ed;font-family:Arial,sans-serif;color:#242827"><main style="max-width:560px;margin:32px auto;padding:28px;background:#fffefc;border:1px solid #ded9d2;border-radius:16px"><h1 style="font-size:24px;margin:0 0 12px">Promemoria appuntamento</h1><p>Ciao ${escapeHtml(reminder.customerName)}, ti ricordiamo il tuo appuntamento di domani.</p>${testNote}<table style="width:100%;border-collapse:collapse;margin:24px 0"><tbody><tr><td style="padding:10px 0;color:#6f716e">Servizio</td><td style="padding:10px 0;text-align:right">${escapeHtml(reminder.serviceName)}</td></tr><tr><td style="padding:10px 0;color:#6f716e">Addetto</td><td style="padding:10px 0;text-align:right">${escapeHtml(reminder.employeeName)}</td></tr><tr><td style="padding:10px 0;color:#6f716e">Giorno</td><td style="padding:10px 0;text-align:right">${escapeHtml(date)}</td></tr><tr><td style="padding:10px 0;color:#6f716e">Orario</td><td style="padding:10px 0;text-align:right">${escapeHtml(formatTime(reminder.startTime))} – ${escapeHtml(formatTime(reminder.endTime))}</td></tr><tr><td style="padding:10px 0;color:#6f716e">Prezzo</td><td style="padding:10px 0;text-align:right;font-weight:bold">${escapeHtml(price)}</td></tr></tbody></table><p style="font-size:13px;color:#6f716e">Per modificare o annullare, accedi all&apos;area clienti almeno 24 ore prima dell&apos;appuntamento.</p>${accountAction}</main></body></html>`;

	const brevo = new BrevoClient({ apiKey, timeoutInSeconds: 8, maxRetries: 0 });
	await brevo.transactionalEmails.sendTransacEmail({
		sender: { name: senderName, email: senderEmail },
		to: [{ email: recipient, name: reminder.customerName }],
		subject: `${mode === "test" ? "[TEST] " : ""}Promemoria appuntamento - ${senderName}`,
		htmlContent,
		tags: ["appointment-reminder"],
	});
	return true;
}
