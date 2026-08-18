"use client";

import { useEffect, useRef, useCallback, useState } from "react";

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
 * - Auto-reconnects with exponential back-off (1s → 2s → 4s → max 30s)
 *   if the connection drops.
 * - Cleans up on unmount or when `enabled` becomes false.
 * - Exposes `unreadCount` which increments per incoming notification
 *   and resets to 0 when `clearUnread()` is called.
 */
export function useNotificationStream({ onNotification, enabled }: Options) {
	const [unreadCount, setUnreadCount] = useState(0);
	const esRef = useRef<EventSource | null>(null);
	const retryDelayRef = useRef(1000);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountedRef = useRef(true);

	const clearUnread = useCallback(() => setUnreadCount(0), []);

	const connect = useCallback(() => {
		if (!mountedRef.current || !enabled) return;

		// Clean up any existing connection
		if (esRef.current) {
			esRef.current.close();
			esRef.current = null;
		}

		const es = new EventSource("/api/notifications/stream", {
			withCredentials: true,
		});

		esRef.current = es;

		es.addEventListener("connected", () => {
			// Reset back-off on successful connection
			retryDelayRef.current = 1000;
		});

		es.addEventListener("notification", (event: MessageEvent) => {
			if (!mountedRef.current) return;
			try {
				const notification = JSON.parse(event.data) as StreamNotification;
				setUnreadCount((c) => c + 1);
				onNotification(notification);
			} catch {
				// malformed event — skip
			}
		});

		es.onerror = () => {
			es.close();
			esRef.current = null;

			if (!mountedRef.current || !enabled) return;

			// Exponential back-off, capped at 30 s
			const delay = retryDelayRef.current;
			retryDelayRef.current = Math.min(delay * 2, 30_000);

			retryTimerRef.current = setTimeout(() => {
				if (mountedRef.current && enabled) connect();
			}, delay);
		};
	}, [enabled, onNotification]);

	useEffect(() => {
		mountedRef.current = true;

		if (enabled) {
			connect();
		}

		return () => {
			mountedRef.current = false;

			if (retryTimerRef.current) {
				clearTimeout(retryTimerRef.current);
			}

			if (esRef.current) {
				esRef.current.close();
				esRef.current = null;
			}
		};
	}, [enabled, connect]);

	return { unreadCount, clearUnread };
}
