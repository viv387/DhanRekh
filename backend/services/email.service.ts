import nodemailer from "nodemailer";

import { authEnv } from "@/backend/config/env";

type EmailPayload = {
	to: string;
	subject: string;
	text: string;
	html?: string;
};

type EmailEvent = {
	eventType: "deposit.completed" | "withdraw.completed" | "transfer.completed";
	transactionId: string;
	amount: string;
	timestamp: string;
	userId?: string;
	senderUserId?: string;
	receiverUserId?: string;
	walletId?: string;
	senderWalletId?: string;
	receiverWalletId?: string;
	userEmail?: string;
	senderEmail?: string;
	receiverEmail?: string;
};

let cachedTransport: any = null;

function hasSmtpConfig() {
	return Boolean(authEnv.mailHost && authEnv.mailUser && authEnv.mailPassword);
}

function getTransport() {
	if (!hasSmtpConfig()) {
		return null;
	}

	if (!cachedTransport) {
		cachedTransport = nodemailer.createTransport({
			host: authEnv.mailHost,
			port: authEnv.mailPort,
			secure: authEnv.mailSecure,
			auth: {
				user: authEnv.mailUser,
				pass: authEnv.mailPassword,
			},
		});
	}

	return cachedTransport;
}

async function sendEmail(payload: EmailPayload) {
	const transport = getTransport();
	if (!transport) {
		return null;
	}

	return transport.sendMail({
		from: authEnv.mailFrom,
		to: payload.to,
		subject: payload.subject,
		text: payload.text,
		html: payload.html,
	});
}

function formatMoney(amount: string) {
	const parsed = Number(amount);
	return Number.isFinite(parsed) ? parsed.toFixed(2) : amount;
}

function buildEventEmail(event: EmailEvent) {
	if (event.eventType === "deposit.completed") {
		if (!event.userEmail) {
			return null;
		}

		return {
			to: event.userEmail,
			subject: "Deposit confirmed",
			text: `A deposit of ${formatMoney(event.amount)} was completed for your wallet ${event.walletId}.`,
		};
	}

	if (event.eventType === "withdraw.completed") {
		if (!event.userEmail) {
			return null;
		}

		return {
			to: event.userEmail,
			subject: "Withdrawal confirmed",
			text: `A withdrawal of ${formatMoney(event.amount)} was completed for your wallet ${event.walletId}.`,
		};
	}

	if (event.eventType === "transfer.completed") {
		const emails: EmailPayload[] = [];
		if (event.senderEmail) {
			emails.push({
				to: event.senderEmail,
				subject: "Transfer sent",
				text: `You sent ${formatMoney(event.amount)} from wallet ${event.senderWalletId} to wallet ${event.receiverWalletId}.`,
			});
		}
		if (event.receiverEmail) {
			emails.push({
				to: event.receiverEmail,
				subject: "Transfer received",
				text: `You received ${formatMoney(event.amount)} into wallet ${event.receiverWalletId}.`,
			});
		}
		return emails;
	}

	return null;
}

export const emailService = {
	async handleKafkaEvent(rawMessage: string) {
		if (!rawMessage) {
			return [];
		}

		const event = JSON.parse(rawMessage) as EmailEvent;
		const emailPayload = buildEventEmail(event);

		if (!emailPayload) {
			return [];
		}

		if (Array.isArray(emailPayload)) {
			return Promise.all(emailPayload.map((payload) => sendEmail(payload)));
		}

		return [await sendEmail(emailPayload)];
	},
};