import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { prisma } from "@/backend/prisma/prisma";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint — GET /api/notifications/stream
 *
 * Streams new (unread, unseen) notifications to the connected client
 * using Server-Sent Events. Polls PostgreSQL every 5 seconds and
 * pushes any notifications created after the connection was established.
 *
 * Event format:
 *   data: { id, title, message, createdAt }
 *
 * The client marks a notification as "received" once SSE sends it;
 * read status (isRead) is still managed manually by the user.
 */
export async function GET(request: Request) {
	const user = await getAuthenticatedUser(request);

	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const userId = user.id;

	// Use the request timestamp as a cursor — only push notifications
	// created AFTER the SSE connection was opened.
	const streamOpenedAt = new Date();

	const encoder = new TextEncoder();

	let closed = false;

	const stream = new ReadableStream({
		async start(controller) {
			// Send an initial ping to confirm connection
			controller.enqueue(
				encoder.encode(
					`event: connected\ndata: ${JSON.stringify({ userId, message: "Notification stream connected" })}\n\n`,
				),
			);

			const poll = async () => {
				if (closed) return;

				try {
					// Fetch new notifications created since SSE stream opened
					const newNotifications = await prisma.notification.findMany({
						where: {
							userId,
							createdAt: { gt: streamOpenedAt },
						},
						orderBy: { createdAt: "asc" },
					});

					for (const notification of newNotifications) {
						if (closed) break;

						const payload = JSON.stringify({
							id: notification.id,
							title: notification.title,
							message: notification.message,
							isRead: notification.isRead,
							createdAt: notification.createdAt.toISOString(),
						});

						controller.enqueue(
							encoder.encode(`event: notification\ndata: ${payload}\n\n`),
						);

						// Advance cursor so we don't send duplicates
						if (notification.createdAt > streamOpenedAt) {
							// Update our cursor to the latest seen notification
							(streamOpenedAt as any) = notification.createdAt;
						}
					}

					// Send a heartbeat to keep the connection alive every 25s
					controller.enqueue(encoder.encode(`: heartbeat\n\n`));
				} catch {
					// DB hiccup — do not crash the stream, retry next tick
				}

				if (!closed) {
					setTimeout(poll, 5000);
				}
			};

			// Start polling
			setTimeout(poll, 5000);

			// Detect client disconnect
			request.signal.addEventListener("abort", () => {
				closed = true;
				try {
					controller.close();
				} catch {
					// already closed
				}
			});
		},

		cancel() {
			closed = true;
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no", // Disable Nginx buffering for SSE
		},
	});
}
