"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type StreamNotification = {
	id: string;
	title: string;
	message: string;
	isRead: boolean;
	createdAt: string;
};

type Options = {
	/** Called each time a new notification arrives */
	onNotification: (n: StreamNotification) => void;
	/** Whether the user is authenticated. Stream won't open when false. */
	enabled: boolean;
};

/**
 * useNotificationStream
 *
 * Opens a persistent SSE connection to /api/notifications/stream and
 * invokes `onNotification` for every new notification pushed by the server.
 *
 * Reconnects automatically with exponential back-off (1s → 2s → 4s → 30s max).
 * Exposes `unreadCount` and `clearUnread()` to the consumer.
 */
export function useNotificationStream({ onNotification, enabled }: Options) {
	const [unreadCount, setUnreadCount] = useState(0);
	const retryDelayRef = useRef(1000);

	const clearUnread = useCallback(() => setUnreadCount(0), []);

	useEffect(() => {
		if (!enabled) return;

		let es: EventSource | null = null;
		let retryTimer: ReturnType<typeof setTimeout> | null = null;
		let cancelled = false;

		function open() {
			if (cancelled) return;

			if (es) {
				es.close();
				es = null;
			}

			const source = new EventSource("/api/notifications/stream", {
				withCredentials: true,
			});
			es = source;

			source.addEventListener("connected", () => {
				retryDelayRef.current = 1000;
			});

			source.addEventListener("notification", (event: MessageEvent) => {
				if (cancelled) return;
				try {
					const notification = JSON.parse(event.data) as StreamNotification;
					setUnreadCount((c) => c + 1);
					onNotification(notification);
				} catch {
					// malformed payload — ignore
				}
			});

			source.onerror = () => {
				source.close();
				es = null;
				if (cancelled) return;

				const delay = retryDelayRef.current;
				retryDelayRef.current = Math.min(delay * 2, 30_000);
				retryTimer = setTimeout(open, delay);
			};
		}

		open();

		return () => {
			cancelled = true;
			if (retryTimer) clearTimeout(retryTimer);
			if (es) {
				es.close();
				es = null;
			}
		};
	}, [enabled, onNotification]);

	return { unreadCount, clearUnread };
}
