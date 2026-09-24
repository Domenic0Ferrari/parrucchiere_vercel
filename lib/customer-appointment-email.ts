import "server-only";

import { BrevoClient } from "@getbrevo/brevo";

type ChangeEmail = { type: "changed" | "cancelled"; to: string; name: string; service: string; employee: string; startTime: string; endTime: string; price: number | string | null };

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export async function sendCustomerAppointmentEmail(data: ChangeEmail) {
	const apiKey = process.env.BREVO_API_KEY;
	const senderEmail = process.env.BREVO_SENDER_EMAIL;
	const mode = process.env.BREVO_EMAIL_MODE;
	if (!apiKey || !senderEmail || (mode !== "test" && mode !== "live")) return false;
	const recipient = mode === "test" ? process.env.BREVO_TEST_RECIPIENT?.trim() : data.to;
	if (!recipient) return false;
	const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Il salone";
	const date = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", dateStyle: "full" }).format(new Date(data.startTime));
	const formatTime = (value: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
	const price = data.price == null ? "Da definire in salone" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(data.price));
	const title = data.type === "changed" ? "Prenotazione modificata" : "Prenotazione annullata";
	const note = mode === "test" ? `<p>Destinatario previsto: ${escapeHtml(data.to)}</p>` : "";
	const htmlContent = `<html lang="it"><body style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;color:#242827"><h1>${title}</h1><p>Ciao ${escapeHtml(data.name)}, ${data.type === "changed" ? "ecco i nuovi dettagli del tuo appuntamento." : "il tuo appuntamento è stato annullato."}</p>${note}<p><strong>Servizio:</strong> ${escapeHtml(data.service)}<br><strong>Addetto:</strong> ${escapeHtml(data.employee)}<br><strong>Data:</strong> ${escapeHtml(date)}<br><strong>Orario:</strong> ${escapeHtml(formatTime(data.startTime))}–${escapeHtml(formatTime(data.endTime))}<br><strong>Prezzo:</strong> ${escapeHtml(price)}</p><p>Per assistenza contatta il salone.</p></body></html>`;
	const brevo = new BrevoClient({ apiKey, timeoutInSeconds: 8, maxRetries: 0 });
	await brevo.transactionalEmails.sendTransacEmail({
		sender: { name: senderName, email: senderEmail },
		to: [{ email: recipient, name: data.name }],
		subject: `${mode === "test" ? "[TEST] " : ""}${title} - ${senderName}`,
		htmlContent,
		tags: ["booking-change"],
	});
	return true;
}
