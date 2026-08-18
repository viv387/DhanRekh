"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/ui/AppShell";

// ─── Types ───────────────────────────────────────────────────────────────────

type FraudAlert = {
	id: string;
	userId: string;
	riskScore: number;
	confidenceScore: number;
	reasons: string[];
	status: string;
	createdAt: string;
	user: { id: string; username: string; email: string };
	transaction: {
		id: string;
		amount: string;
		transactionType: string;
		status: string;
	} | null;
};

type DlqMessage = {
	id: string;
	topic: string;
	consumerGroup: string;
	payload: string;
	errorReason: string;
	status: string;
	createdAt: string;
	replayedAt: string | null;
};

type FraudSummary = Record<string, number>;
type DlqSummary = Record<string, number>;

// ─── Risk Badge ───────────────────────────────────────────────────────────────

function RiskBadge({ score }: { score: number }) {
	const level =
		score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";

	const styles: Record<string, { bg: string; text: string; label: string }> = {
		critical: { bg: "rgba(244,63,94,0.15)", text: "#fb7185", label: "CRITICAL" },
		high: { bg: "rgba(251,146,60,0.15)", text: "#fb923c", label: "HIGH" },
		medium: { bg: "rgba(250,204,21,0.12)", text: "#fbbf24", label: "MEDIUM" },
		low: { bg: "rgba(52,211,153,0.12)", text: "#6ee7b7", label: "LOW" },
	};

	const s = styles[level];
	return (
		<span
			style={{
				background: s.bg,
				color: s.text,
				border: `1px solid ${s.text}30`,
				borderRadius: "0.4rem",
				padding: "0.2rem 0.5rem",
				fontSize: "0.65rem",
				fontWeight: 700,
				letterSpacing: "0.08em",
				fontFamily: "var(--font-mono)",
			}}
		>
			{s.label} · {score}
		</span>
	);
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, { bg: string; text: string }> = {
		FLAGGED: { bg: "rgba(244,63,94,0.12)", text: "#fb7185" },
		RESOLVED: { bg: "rgba(52,211,153,0.12)", text: "#6ee7b7" },
		DISMISSED: { bg: "rgba(148,163,184,0.1)", text: "#94a3b8" },
		FAILED: { bg: "rgba(244,63,94,0.12)", text: "#fb7185" },
		REPLAYED: { bg: "rgba(34,211,238,0.12)", text: "#22d3ee" },
	};
	const s = map[status] ?? { bg: "rgba(148,163,184,0.1)", text: "#94a3b8" };
	return (
		<span
			style={{
				background: s.bg,
				color: s.text,
				border: `1px solid ${s.text}30`,
				borderRadius: "0.4rem",
				padding: "0.2rem 0.5rem",
				fontSize: "0.65rem",
				fontWeight: 700,
				letterSpacing: "0.08em",
			}}
		>
			{status}
		</span>
	);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div
			style={{
				background: "rgba(255,255,255,0.03)",
				border: "1px solid rgba(255,255,255,0.07)",
				borderRadius: "0.875rem",
				padding: "1rem 1.25rem",
				flex: 1,
				minWidth: 120,
			}}
		>
			<p style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>
				{label}
			</p>
			<p style={{ fontSize: "1.75rem", fontWeight: 700, color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
				{value}
			</p>
		</div>
	);
}

// ─── Fraud Tab ────────────────────────────────────────────────────────────────

function FraudTab() {
	const [alerts, setAlerts] = useState<FraudAlert[]>([]);
	const [summary, setSummary] = useState<FraudSummary>({});
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<string>("FLAGGED");
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const fetchAlerts = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(
				`/api/admin/fraud?status=${filter === "ALL" ? "" : filter}&limit=100`,
				{ credentials: "include" },
			);
			const data = await res.json();
			setAlerts(data.alerts ?? []);
			setSummary(data.summary ?? {});
		} finally {
			setLoading(false);
		}
	}, [filter]);

	useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

	const resolve = async (id: string, status: "RESOLVED" | "DISMISSED") => {
		setActionLoading(id);
		try {
			await fetch(`/api/admin/fraud/${id}`, {
				method: "PATCH",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status }),
			});
			await fetchAlerts();
		} finally {
			setActionLoading(null);
		}
	};

	const totalFlagged = summary["FLAGGED"] ?? 0;
	const totalResolved = summary["RESOLVED"] ?? 0;
	const totalDismissed = summary["DISMISSED"] ?? 0;

	return (
		<div>
			{/* Stats */}
			<div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
				<StatCard label="Flagged" value={totalFlagged} color="#fb7185" />
				<StatCard label="Resolved" value={totalResolved} color="#6ee7b7" />
				<StatCard label="Dismissed" value={totalDismissed} color="#94a3b8" />
				<StatCard label="Total" value={totalFlagged + totalResolved + totalDismissed} color="#22d3ee" />
			</div>

			{/* Filter Pills */}
			<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
				{["FLAGGED", "RESOLVED", "DISMISSED", "ALL"].map((f) => (
					<button
						key={f}
						onClick={() => setFilter(f)}
						style={{
							padding: "0.35rem 0.85rem",
							borderRadius: "9999px",
							border: filter === f ? "1px solid #22d3ee40" : "1px solid rgba(255,255,255,0.08)",
							background: filter === f ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.03)",
							color: filter === f ? "#22d3ee" : "#94a3b8",
							fontSize: "0.75rem",
							fontWeight: 600,
							cursor: "pointer",
							transition: "all 0.15s",
						}}
					>
						{f}
					</button>
				))}
			</div>

			{/* Table */}
			{loading ? (
				<div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading fraud alerts…</div>
			) : alerts.length === 0 ? (
				<div style={{
					padding: "3rem",
					textAlign: "center",
					color: "#64748b",
					background: "rgba(255,255,255,0.02)",
					borderRadius: "1rem",
					border: "1px solid rgba(255,255,255,0.06)",
				}}>
					<div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🛡️</div>
					<p>No fraud alerts matching &ldquo;{filter}&rdquo;</p>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
					{alerts.map((alert) => {
						const isExpanded = expandedId === alert.id;
						return (
							<div
								key={alert.id}
								style={{
									background: "rgba(255,255,255,0.025)",
									border: "1px solid rgba(255,255,255,0.07)",
									borderRadius: "0.875rem",
									overflow: "hidden",
									transition: "border-color 0.15s",
								}}
							>
								{/* Row */}
								<div
									style={{
										padding: "0.875rem 1rem",
										display: "flex",
										alignItems: "center",
										gap: "0.75rem",
										flexWrap: "wrap",
										cursor: "pointer",
									}}
									onClick={() => setExpandedId(isExpanded ? null : alert.id)}
								>
									{/* Risk */}
									<RiskBadge score={alert.riskScore} />

									{/* User */}
									<div style={{ flex: 1, minWidth: 160 }}>
										<p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f8fafc" }}>
											{alert.user?.username ?? "Unknown"}
										</p>
										<p style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)" }}>
											{alert.user?.email ?? alert.userId}
										</p>
									</div>

									{/* Transaction */}
									{alert.transaction && (
										<div style={{ minWidth: 120 }}>
											<p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
												{alert.transaction.transactionType}
											</p>
											<p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f8fafc", fontFamily: "var(--font-mono)" }}>
												${Number(alert.transaction.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
											</p>
										</div>
									)}

									{/* Confidence */}
									<div style={{ minWidth: 80, textAlign: "center" }}>
										<p style={{ fontSize: "0.65rem", color: "#64748b" }}>Confidence</p>
										<p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fbbf24" }}>{alert.confidenceScore}%</p>
									</div>

									{/* Status */}
									<StatusBadge status={alert.status} />

									{/* Date */}
									<p style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
										{new Date(alert.createdAt).toLocaleDateString("en-IN", {
											day: "2-digit", month: "short", year: "numeric",
										})}
									</p>

									{/* Expand chevron */}
									<span style={{ color: "#64748b", fontSize: "0.7rem", marginLeft: "auto" }}>
										{isExpanded ? "▲" : "▼"}
									</span>
								</div>

								{/* Expanded Detail */}
								{isExpanded && (
									<div
										style={{
											borderTop: "1px solid rgba(255,255,255,0.06)",
											padding: "0.875rem 1rem",
											background: "rgba(0,0,0,0.15)",
										}}
									>
										{/* Reasons */}
										<p style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
											Risk Reasons
										</p>
										<ul style={{ marginBottom: "1rem", paddingLeft: "1rem" }}>
											{(Array.isArray(alert.reasons) ? alert.reasons : [alert.reasons]).map((r, i) => (
												<li key={i} style={{ fontSize: "0.8rem", color: "#fb7185", marginBottom: "0.25rem" }}>
													⚠ {r}
												</li>
											))}
										</ul>

										{/* Actions — only for FLAGGED */}
										{alert.status === "FLAGGED" && (
											<div style={{ display: "flex", gap: "0.5rem" }}>
												<button
													onClick={() => resolve(alert.id, "RESOLVED")}
													disabled={actionLoading === alert.id}
													style={{
														padding: "0.45rem 1rem",
														borderRadius: "0.5rem",
														border: "1px solid rgba(52,211,153,0.3)",
														background: "rgba(52,211,153,0.1)",
														color: "#6ee7b7",
														fontSize: "0.75rem",
														fontWeight: 600,
														cursor: actionLoading === alert.id ? "not-allowed" : "pointer",
														opacity: actionLoading === alert.id ? 0.5 : 1,
													}}
												>
													✓ Mark Resolved
												</button>
												<button
													onClick={() => resolve(alert.id, "DISMISSED")}
													disabled={actionLoading === alert.id}
													style={{
														padding: "0.45rem 1rem",
														borderRadius: "0.5rem",
														border: "1px solid rgba(148,163,184,0.2)",
														background: "rgba(148,163,184,0.06)",
														color: "#94a3b8",
														fontSize: "0.75rem",
														fontWeight: 600,
														cursor: actionLoading === alert.id ? "not-allowed" : "pointer",
														opacity: actionLoading === alert.id ? 0.5 : 1,
													}}
												>
													✕ Dismiss
												</button>
											</div>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

// ─── DLQ Tab ──────────────────────────────────────────────────────────────────

function DlqTab() {
	const [messages, setMessages] = useState<DlqMessage[]>([]);
	const [summary, setSummary] = useState<DlqSummary>({});
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<string>("FAILED");
	const [replayLoading, setReplayLoading] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [replayResult, setReplayResult] = useState<Record<string, "ok" | "err">>({});

	const fetchMessages = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(
				`/api/admin/dlq?status=${filter}&limit=100`,
				{ credentials: "include" },
			);
			const data = await res.json();
			setMessages(data.messages ?? []);
			setSummary(data.summary ?? {});
		} finally {
			setLoading(false);
		}
	}, [filter]);

	useEffect(() => { fetchMessages(); }, [fetchMessages]);

	const replay = async (id: string) => {
		setReplayLoading(id);
		try {
			const res = await fetch("/api/admin/dlq", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ dlqId: id }),
			});
			setReplayResult((prev) => ({ ...prev, [id]: res.ok ? "ok" : "err" }));
			if (res.ok) await fetchMessages();
		} catch {
			setReplayResult((prev) => ({ ...prev, [id]: "err" }));
		} finally {
			setReplayLoading(null);
		}
	};

	const totalFailed = summary["FAILED"] ?? 0;
	const totalReplayed = summary["REPLAYED"] ?? 0;

	return (
		<div>
			{/* Stats */}
			<div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
				<StatCard label="Failed" value={totalFailed} color="#fb7185" />
				<StatCard label="Replayed" value={totalReplayed} color="#22d3ee" />
				<StatCard label="Total" value={totalFailed + totalReplayed} color="#94a3b8" />
			</div>

			{/* Filter Pills */}
			<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
				{["FAILED", "REPLAYED", "ALL"].map((f) => (
					<button
						key={f}
						onClick={() => setFilter(f)}
						style={{
							padding: "0.35rem 0.85rem",
							borderRadius: "9999px",
							border: filter === f ? "1px solid #22d3ee40" : "1px solid rgba(255,255,255,0.08)",
							background: filter === f ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.03)",
							color: filter === f ? "#22d3ee" : "#94a3b8",
							fontSize: "0.75rem",
							fontWeight: 600,
							cursor: "pointer",
							transition: "all 0.15s",
						}}
					>
						{f}
					</button>
				))}
			</div>

			{/* Table */}
			{loading ? (
				<div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading DLQ messages…</div>
			) : messages.length === 0 ? (
				<div style={{
					padding: "3rem",
					textAlign: "center",
					color: "#64748b",
					background: "rgba(255,255,255,0.02)",
					borderRadius: "1rem",
					border: "1px solid rgba(255,255,255,0.06)",
				}}>
					<div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
					<p>No DLQ messages with status &ldquo;{filter}&rdquo;</p>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
					{messages.map((msg) => {
						const isExpanded = expandedId === msg.id;
						let parsedPayload: unknown = null;
						try { parsedPayload = JSON.parse(msg.payload); } catch { parsedPayload = msg.payload; }

						return (
							<div
								key={msg.id}
								style={{
									background: "rgba(255,255,255,0.025)",
									border: "1px solid rgba(255,255,255,0.07)",
									borderRadius: "0.875rem",
									overflow: "hidden",
								}}
							>
								{/* Row */}
								<div
									style={{
										padding: "0.875rem 1rem",
										display: "flex",
										alignItems: "center",
										gap: "0.75rem",
										flexWrap: "wrap",
										cursor: "pointer",
									}}
									onClick={() => setExpandedId(isExpanded ? null : msg.id)}
								>
									{/* Topic */}
									<span style={{
										background: "rgba(139,92,246,0.12)",
										color: "#a78bfa",
										border: "1px solid rgba(139,92,246,0.25)",
										borderRadius: "0.4rem",
										padding: "0.2rem 0.5rem",
										fontSize: "0.65rem",
										fontWeight: 700,
										fontFamily: "var(--font-mono)",
									}}>
										{msg.topic}
									</span>

									{/* Consumer group */}
									<div style={{ flex: 1, minWidth: 160 }}>
										<p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#f8fafc" }}>
											{msg.consumerGroup}
										</p>
										<p style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)" }}>
											{msg.id.slice(0, 12)}…
										</p>
									</div>

									{/* Error reason */}
									<p style={{
										fontSize: "0.72rem",
										color: "#fb7185",
										flex: 2,
										minWidth: 180,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
										maxWidth: 300,
									}}>
										{msg.errorReason}
									</p>

									{/* Status */}
									<StatusBadge status={msg.status} />

									{/* Date */}
									<p style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
										{new Date(msg.createdAt).toLocaleDateString("en-IN", {
											day: "2-digit", month: "short", year: "numeric",
										})}
									</p>

									<span style={{ color: "#64748b", fontSize: "0.7rem" }}>
										{isExpanded ? "▲" : "▼"}
									</span>
								</div>

								{/* Expanded Detail */}
								{isExpanded && (
									<div
										style={{
											borderTop: "1px solid rgba(255,255,255,0.06)",
											padding: "0.875rem 1rem",
											background: "rgba(0,0,0,0.15)",
										}}
									>
										{/* Full error */}
										<p style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
											Error
										</p>
										<p style={{ fontSize: "0.8rem", color: "#fb7185", marginBottom: "1rem" }}>
											{msg.errorReason}
										</p>

										{/* Payload */}
										<p style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
											Payload
										</p>
										<pre style={{
											fontSize: "0.7rem",
											color: "#94a3b8",
											background: "rgba(0,0,0,0.3)",
											border: "1px solid rgba(255,255,255,0.06)",
											borderRadius: "0.5rem",
											padding: "0.75rem",
											overflowX: "auto",
											fontFamily: "var(--font-mono)",
											marginBottom: "1rem",
											maxHeight: 200,
										}}>
											{JSON.stringify(parsedPayload, null, 2)}
										</pre>

										{/* Replayed at */}
										{msg.replayedAt && (
											<p style={{ fontSize: "0.72rem", color: "#22d3ee", marginBottom: "1rem" }}>
												✓ Replayed at {new Date(msg.replayedAt).toLocaleString("en-IN")}
											</p>
										)}

										{/* Replay button */}
										{msg.status === "FAILED" && (
											<button
												onClick={() => replay(msg.id)}
												disabled={replayLoading === msg.id}
												style={{
													padding: "0.45rem 1.1rem",
													borderRadius: "0.5rem",
													border: "1px solid rgba(34,211,238,0.3)",
													background: "rgba(34,211,238,0.1)",
													color: "#22d3ee",
													fontSize: "0.75rem",
													fontWeight: 600,
													cursor: replayLoading === msg.id ? "not-allowed" : "pointer",
													opacity: replayLoading === msg.id ? 0.5 : 1,
													display: "flex",
													alignItems: "center",
													gap: "0.4rem",
												}}
											>
												{replayLoading === msg.id ? (
													<>⟳ Replaying…</>
												) : replayResult[msg.id] === "ok" ? (
													<>✓ Replayed</>
												) : replayResult[msg.id] === "err" ? (
													<>✕ Failed — Retry</>
												) : (
													<>⟳ Replay Message</>
												)}
											</button>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
	const [activeTab, setActiveTab] = useState<"fraud" | "dlq">("fraud");

	return (
		<AppShell>
			<div style={{ maxWidth: "1100px", margin: "0 auto" }}>
				{/* Page Header */}
				<div style={{ marginBottom: "2rem" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
						<div style={{
							width: "2.25rem", height: "2.25rem",
							borderRadius: "0.625rem",
							background: "linear-gradient(135deg, rgba(244,63,94,0.3), rgba(139,92,246,0.3))",
							border: "1px solid rgba(244,63,94,0.3)",
							display: "flex", alignItems: "center", justifyContent: "center",
							fontSize: "1.1rem",
						}}>
							🛡️
						</div>
						<h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
							Compliance & Operations
						</h1>
					</div>
					<p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0 }}>
						Monitor fraud alerts, review risk-flagged transactions, and replay dead-letter queue events.
					</p>
				</div>

				{/* Tabs */}
				<div style={{
					display: "flex",
					gap: "0.25rem",
					background: "rgba(255,255,255,0.03)",
					border: "1px solid rgba(255,255,255,0.07)",
					borderRadius: "0.75rem",
					padding: "0.3rem",
					marginBottom: "1.5rem",
					width: "fit-content",
				}}>
					{(["fraud", "dlq"] as const).map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							style={{
								padding: "0.5rem 1.25rem",
								borderRadius: "0.5rem",
								border: "none",
								background: activeTab === tab
									? "rgba(255,255,255,0.08)"
									: "transparent",
								color: activeTab === tab ? "#f8fafc" : "#64748b",
								fontSize: "0.825rem",
								fontWeight: activeTab === tab ? 600 : 500,
								cursor: "pointer",
								transition: "all 0.15s",
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
							}}
						>
							{tab === "fraud" ? (
								<>
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
									</svg>
									Fraud Alerts
								</>
							) : (
								<>
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<polyline points="1 4 1 10 7 10" />
										<path d="M3.51 15a9 9 0 1 0 .49-3.5" />
									</svg>
									Dead Letter Queue
								</>
							)}
						</button>
					))}
				</div>

				{/* Tab Content */}
				{activeTab === "fraud" ? <FraudTab /> : <DlqTab />}
			</div>
		</AppShell>
	);
}
