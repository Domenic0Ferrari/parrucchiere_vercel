import { BrevoClient } from "@getbrevo/brevo";

type BookingEmail = {
	to: string;
	customerName: string;
	serviceName: string;
	employeeName: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	price: number | string | null;
};

const dateFormatter = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function sendBookingConfirmationEmail(booking: BookingEmail) {
	const apiKey = process.env.BREVO_API_KEY;
	const senderEmail = process.env.BREVO_SENDER_EMAIL;
	const mode = process.env.BREVO_EMAIL_MODE;
	if (!apiKey || !senderEmail || (mode !== "test" && mode !== "live")) return false;

	const testRecipient = process.env.BREVO_TEST_RECIPIENT?.trim();
	if (mode === "test" && !testRecipient) return false;
	const recipient = mode === "test" ? testRecipient! : booking.to;
	const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Il salone";
	const rawSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "").trim().replace(/\/$/, "");
	const siteUrl = rawSiteUrl && /^https?:\/\//.test(rawSiteUrl) ? rawSiteUrl : rawSiteUrl ? `https://${rawSiteUrl}` : "";
	const accountUrl = siteUrl ? `${siteUrl}/account/login` : "";
	const start = new Date(booking.startTime);
	const end = new Date(booking.endTime);
	const date = dateFormatter.format(start);
	const time = `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
	const price = booking.price === null ? "Da definire in salone" : priceFormatter.format(Number(booking.price));
	const duration = `${booking.durationMinutes} minuti`;
	const subject = `${mode === "test" ? "[TEST] " : ""}Conferma prenotazione - ${senderName}`;
	const testNote = mode === "test" ? `<p style="color:#666">Destinatario previsto: ${escapeHtml(booking.to)}</p>` : "";

	const accountAction = accountUrl ? `<p style="margin:24px 0 0"><a href="${escapeHtml(accountUrl)}" style="display:inline-block;background:#18181b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">Accedi per gestire l&apos;appuntamento</a></p><p style="font-size:13px;color:#666">Puoi modificare o annullare l&apos;appuntamento fino a 24 ore prima.</p>` : `<p style="font-size:13px;color:#666">Per modificare o annullare l&apos;appuntamento fino a 24 ore prima, accedi all&apos;area clienti.</p>`;
	const htmlContent = `<!doctype html><html lang="it"><body style="margin:0;background:#f7f7f7;font-family:Arial,sans-serif;color:#242827"><main style="max-width:560px;margin:32px auto;padding:28px;background:#fff;border:1px solid #e4e4e7;border-radius:16px"><h1 style="font-size:24px;margin:0 0 12px">Prenotazione confermata</h1><p>Ciao ${escapeHtml(booking.customerName)}, ti aspettiamo in salone!</p>${testNote}<table style="width:100%;border-collapse:collapse;margin:24px 0"><tbody><tr><td style="padding:10px 0;color:#666">Servizio</td><td style="padding:10px 0;text-align:right">${escapeHtml(booking.serviceName)}</td></tr><tr><td style="padding:10px 0;color:#666">Addetto</td><td style="padding:10px 0;text-align:right">${escapeHtml(booking.employeeName)}</td></tr><tr><td style="padding:10px 0;color:#666">Giorno</td><td style="padding:10px 0;text-align:right">${escapeHtml(date)}</td></tr><tr><td style="padding:10px 0;color:#666">Orario</td><td style="padding:10px 0;text-align:right">${escapeHtml(time)}</td></tr><tr><td style="padding:10px 0;color:#666">Durata</td><td style="padding:10px 0;text-align:right">${escapeHtml(duration)}</td></tr><tr><td style="padding:10px 0;color:#666">Prezzo</td><td style="padding:10px 0;text-align:right;font-weight:bold">${escapeHtml(price)}</td></tr></tbody></table>${accountAction}</main></body></html>`;

	const brevo = new BrevoClient({ apiKey, timeoutInSeconds: 8, maxRetries: 0 });
	await brevo.transactionalEmails.sendTransacEmail({
		sender: { name: senderName, email: senderEmail },
		to: [{ email: recipient, name: booking.customerName }],
		subject,
		htmlContent,
		tags: ["booking-confirmation"],
	});
	return true;
}
