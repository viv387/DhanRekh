import { notificationRepository } from "@/backend/repositories/notification.repository";
import { HttpError } from "@/backend/utils/http-error";

type NotificationRow = {
	id: string;
	userId: string;
	title: string;
	message: string;
	isRead: boolean;
	createdAt: Date;
};

type BaseMoneyEvent = {
	eventType: string;
	transactionId: string;
	amount: string;
	timestamp: string;
};

type DepositEvent = BaseMoneyEvent & {
	eventType: "deposit.completed";
	walletId: string;
	userId: string;
};

type WithdrawEvent = BaseMoneyEvent & {
	eventType: "withdraw.completed";
	walletId: string;
	userId: string;
};

type TransferEvent = BaseMoneyEvent & {
	eventType: "transfer.completed";
	senderWalletId: string;
	receiverWalletId: string;
	senderUserId: string;
	receiverUserId: string;
};

type KafkaNotificationEvent = DepositEvent | WithdrawEvent | TransferEvent;

function normalizeNotification(notification: NotificationRow) {
	return {
		id: notification.id,
		userId: notification.userId,
		title: notification.title,
		message: notification.message,
		isRead: notification.isRead,
		createdAt: notification.createdAt,
	};
}

function formatMoney(amount: string) {
	const parsed = Number(amount);
	return Number.isFinite(parsed) ? parsed.toFixed(2) : amount;
}

function buildDepositNotification(event: DepositEvent) {
	return {
		userId: event.userId,
		title: "Deposit received",
		message: `A deposit of ${formatMoney(event.amount)} was completed for wallet ${event.walletId}.`,
	};
}

function buildWithdrawNotification(event: WithdrawEvent) {
	return {
		userId: event.userId,
		title: "Withdrawal completed",
		message: `A withdrawal of ${formatMoney(event.amount)} was completed for wallet ${event.walletId}.`,
	};
}

function buildTransferNotifications(event: TransferEvent) {
	return [
		{
			userId: event.senderUserId,
			title: "Transfer sent",
			message: `You sent ${formatMoney(event.amount)} from wallet ${event.senderWalletId} to wallet ${event.receiverWalletId}.`,
		},
		{
			userId: event.receiverUserId,
			title: "Transfer received",
			message: `You received ${formatMoney(event.amount)} into wallet ${event.receiverWalletId}.`,
		},
	];
}

export const notificationService = {
	async listForUser(userId: string) {
		const [notifications, unreadCount] = await Promise.all([
			notificationRepository.listForUser(userId),
			notificationRepository.countUnread(userId),
		]);

		return {
			notifications: notifications.map(normalizeNotification),
			unreadCount,
		};
	},

	async markRead(userId: string, notificationId: string) {
		const result = await notificationRepository.markRead(notificationId, userId);

		if (result.count === 0) {
			throw new HttpError(404, "Notification not found");
		}

		const notification = await notificationRepository.listForUser(userId);
		const found = notification.find((item) => item.id === notificationId);
		if (!found) {
			throw new HttpError(404, "Notification not found");
		}

		return normalizeNotification(found);
	},

	async markAllRead(userId: string) {
		await notificationRepository.markAllRead(userId);
		return {
			message: "All notifications marked as read",
		};
	},

	async handleKafkaEvent(topic: string, rawMessage: string) {
		if (!rawMessage) {
			return [];
		}

		const parsed = JSON.parse(rawMessage) as KafkaNotificationEvent;

		if (parsed.eventType === "deposit.completed") {
			const notification = buildDepositNotification(parsed);
			return [await notificationRepository.createForUser(notification.userId, notification.title, notification.message)];
		}

		if (parsed.eventType === "withdraw.completed") {
			const notification = buildWithdrawNotification(parsed);
			return [await notificationRepository.createForUser(notification.userId, notification.title, notification.message)];
		}

		if (parsed.eventType === "transfer.completed") {
			const notifications = buildTransferNotifications(parsed);
			return Promise.all(
				notifications.map((notification) =>
					notificationRepository.createForUser(notification.userId, notification.title, notification.message),
				),
			);
		}

		throw new HttpError(400, `Unsupported notification event from topic ${topic}`);
	},
};export {};
