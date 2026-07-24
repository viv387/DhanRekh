import { auditRepository } from "@/backend/repositories/audit.repository";
import { HttpError } from "@/backend/utils/http-error";

type TransactionEvent = {
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
};

function formatMoney(amount: string) {
	const parsed = Number(amount);
	return Number.isFinite(parsed) ? parsed.toFixed(2) : amount;
}

function buildAuditAction(event: TransactionEvent) {
	if (event.eventType === "deposit.completed") {
		return {
			userId: event.userId ?? null,
			action: `transaction.deposit.completed:${event.transactionId}:${formatMoney(event.amount)}`,
		};
	}

	if (event.eventType === "withdraw.completed") {
		return {
			userId: event.userId ?? null,
			action: `transaction.withdraw.completed:${event.transactionId}:${formatMoney(event.amount)}`,
		};
	}

	if (event.eventType === "transfer.completed") {
		return {
			userId: event.senderUserId ?? null,
			action: `transaction.transfer.completed:${event.transactionId}:${formatMoney(event.amount)}`,
		};
	}

	throw new HttpError(400, "Unsupported audit event");
}

export const auditService = {
	async recordFromEvent(rawMessage: string) {
		if (!rawMessage) {
			return [];
		}

		const event = JSON.parse(rawMessage) as TransactionEvent;
		const action = buildAuditAction(event);

		if (!action.userId) {
			return [];
		}

		const auditEntry = await auditRepository.create(action.userId, action.action);
		return [auditEntry];
	},

	async listRecent(limit = 100) {
		return auditRepository.listRecent(limit);
	},

	async listForUser(userId: string) {
		return auditRepository.listForUser(userId);
	},
};