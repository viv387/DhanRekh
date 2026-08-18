/**
 * Money Ledger — Database Seed Script
 * ====================================
 * Populates the database with 5 realistic demo users, funded wallets,
 * full double-entry ledger transactions (DEPOSIT, WITHDRAW, TRANSFER),
 * notifications, fraud alerts, audit logs, and a scheduled payment.
 *
 * Run: pnpm run db:seed
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
	process.env.DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5432/money_ledger?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ────────────────────────────────────────────────────────────────

function accountNum(seed: string): string {
	// Deterministic account numbers so seed is idempotent
	const num = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
	return `ML${String(num * 1234567).slice(0, 5)}${String(num * 7654321).slice(0, 5)}`;
}

async function hashPw(plain: string): Promise<string> {
	return bcrypt.hash(plain, 10);
}

function dec(n: number): Prisma.Decimal {
	return new Prisma.Decimal(n.toFixed(2));
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const USERS = [
	{
		username: "alice_finance",
		email: "alice@money-ledger.dev",
		phone: "9000000001",
		password: "Demo@1234",
		balance: 5000.0,
		currency: "USD",
	},
	{
		username: "bob_trader",
		email: "bob@money-ledger.dev",
		phone: "9000000002",
		password: "Demo@1234",
		balance: 3500.0,
		currency: "USD",
	},
	{
		username: "charlie_pay",
		email: "charlie@money-ledger.dev",
		phone: "9000000003",
		password: "Demo@1234",
		balance: 1200.0,
		currency: "USD",
	},
	{
		username: "diana_wallet",
		email: "diana@money-ledger.dev",
		phone: "9000000004",
		password: "Demo@1234",
		balance: 8750.0,
		currency: "USD",
	},
	{
		username: "eve_ledger",
		email: "eve@money-ledger.dev",
		phone: "9000000005",
		password: "Demo@1234",
		balance: 500.0,
		currency: "USD",
	},
];

// ─── Main Seed ───────────────────────────────────────────────────────────────

async function main() {
	console.log("🌱 Starting Money Ledger database seed...\n");

	// ── 1. Create Users + Wallets ───────────────────────────────────────────
	console.log("👤 Creating users and wallets...");

	const createdUsers: Array<{
		user: { id: string; username: string; email: string };
		wallet: { id: string; accountNumber: string; balance: Prisma.Decimal };
	}> = [];

	for (const u of USERS) {
		const passwordHash = await hashPw(u.password);
		const acctNum = accountNum(u.username);

		// Upsert user (idempotent seed)
		const user = await prisma.user.upsert({
			where: { email: u.email },
			update: {},
			create: {
				username: u.username,
				email: u.email,
				phone: u.phone,
				passwordHash,
				isEmailVerified: true,
			},
		});

		// Upsert wallet
		const wallet = await prisma.wallet.upsert({
			where: { userId: user.id },
			update: {},
			create: {
				userId: user.id,
				accountNumber: acctNum,
				balance: dec(u.balance),
				currency: u.currency,
				status: "ACTIVE",
			},
		});

		createdUsers.push({ user, wallet });

		console.log(
			`  ✅ ${u.username} | Account: ${acctNum} | Balance: $${u.balance}`,
		);
	}

	const [alice, bob, charlie, diana, eve] = createdUsers;

	// ── 2. Deposit Transactions + Ledger Entries ────────────────────────────
	console.log("\n💰 Creating deposit transactions...");

	const depositData = [
		{ actor: alice, amount: 5000.0, desc: "Initial funding deposit" },
		{ actor: bob, amount: 3500.0, desc: "Initial funding deposit" },
		{ actor: charlie, amount: 1200.0, desc: "Initial funding deposit" },
		{ actor: diana, amount: 8750.0, desc: "Initial funding deposit" },
		{ actor: eve, amount: 500.0, desc: "Initial funding deposit" },
	];

	for (const d of depositData) {
		await prisma.$transaction(async (tx) => {
			const txn = await tx.transaction.create({
				data: {
					receiverWalletId: d.actor.wallet.id,
					amount: dec(d.amount),
					transactionType: "DEPOSIT",
					status: "COMPLETED",
					description: d.desc,
				},
			});
			// CREDIT ledger entry for deposit
			await tx.ledger.create({
				data: {
					transactionId: txn.id,
					walletId: d.actor.wallet.id,
					entryType: "CREDIT",
					amount: dec(d.amount),
					balanceBefore: dec(0),
					balanceAfter: dec(d.amount),
				},
			});
		});
	}

	console.log("  ✅ Deposits created for all 5 users");

	// ── 3. Transfer Transactions + Double-Entry Ledger ──────────────────────
	console.log("\n🔁 Creating P2P transfer transactions...");

	type TransferDef = {
		sender: typeof alice;
		receiver: typeof bob;
		amount: number;
		desc: string;
		senderBefore: number;
		receiverBefore: number;
	};

	const transfers: TransferDef[] = [
		// Alice → Bob: $750
		{
			sender: alice,
			receiver: bob,
			amount: 750.0,
			desc: "Rent payment",
			senderBefore: 5000.0,
			receiverBefore: 3500.0,
		},
		// Bob → Charlie: $300
		{
			sender: bob,
			receiver: charlie,
			amount: 300.0,
			desc: "Grocery split",
			senderBefore: 4250.0,
			receiverBefore: 1200.0,
		},
		// Diana → Alice: $1200
		{
			sender: diana,
			receiver: alice,
			amount: 1200.0,
			desc: "Freelance payment",
			senderBefore: 8750.0,
			receiverBefore: 4250.0,
		},
		// Charlie → Eve: $200
		{
			sender: charlie,
			receiver: eve,
			amount: 200.0,
			desc: "Coffee fund",
			senderBefore: 1500.0,
			receiverBefore: 500.0,
		},
	];

	for (const t of transfers) {
		await prisma.$transaction(async (tx) => {
			const txn = await tx.transaction.create({
				data: {
					senderWalletId: t.sender.wallet.id,
					receiverWalletId: t.receiver.wallet.id,
					amount: dec(t.amount),
					transactionType: "TRANSFER",
					status: "COMPLETED",
					description: t.desc,
				},
			});

			// DEBIT — sender
			await tx.ledger.create({
				data: {
					transactionId: txn.id,
					walletId: t.sender.wallet.id,
					entryType: "DEBIT",
					amount: dec(t.amount),
					balanceBefore: dec(t.senderBefore),
					balanceAfter: dec(t.senderBefore - t.amount),
				},
			});

			// CREDIT — receiver
			await tx.ledger.create({
				data: {
					transactionId: txn.id,
					walletId: t.receiver.wallet.id,
					entryType: "CREDIT",
					amount: dec(t.amount),
					balanceBefore: dec(t.receiverBefore),
					balanceAfter: dec(t.receiverBefore + t.amount),
				},
			});

			console.log(
				`  ✅ ${t.sender.user.username} → ${t.receiver.user.username} : $${t.amount} (${t.desc})`,
			);
		});
	}

	// ── 4. Withdrawal Transaction + Ledger ─────────────────────────────────
	console.log("\n🏧 Creating withdrawal transaction...");

	await prisma.$transaction(async (tx) => {
		const txn = await tx.transaction.create({
			data: {
				senderWalletId: alice.wallet.id,
				amount: dec(500.0),
				transactionType: "WITHDRAW",
				status: "COMPLETED",
				description: "ATM withdrawal",
			},
		});
		await tx.ledger.create({
			data: {
				transactionId: txn.id,
				walletId: alice.wallet.id,
				entryType: "DEBIT",
				amount: dec(500.0),
				balanceBefore: dec(5450.0),
				balanceAfter: dec(4950.0),
			},
		});
	});

	console.log("  ✅ Alice withdrawal: $500 (ATM withdrawal)");

	// ── 5. Fraud Alert (demo) ───────────────────────────────────────────────
	console.log("\n🚨 Creating demo fraud alert...");

	await prisma.fraudAlert.create({
		data: {
			userId: eve.user.id,
			riskScore: 78,
			confidenceScore: 85,
			reasons: JSON.stringify([
				"High-value transaction relative to wallet balance",
				"Unusual transfer velocity — 2 transfers within 10 minutes",
			]),
			status: "FLAGGED",
		},
	});

	console.log("  ✅ Fraud alert created for eve_ledger (risk score: 78)");

	// ── 6. Notifications ────────────────────────────────────────────────────
	console.log("\n🔔 Creating in-app notifications...");

	const notifications = [
		{
			userId: alice.user.id,
			title: "Payment Received",
			message: "You received $1,200.00 from diana_wallet.",
		},
		{
			userId: bob.user.id,
			title: "Payment Received",
			message: "You received $750.00 from alice_finance.",
		},
		{
			userId: charlie.user.id,
			title: "Payment Received",
			message: "You received $300.00 from bob_trader.",
		},
		{
			userId: eve.user.id,
			title: "Payment Received",
			message: "You received $200.00 from charlie_pay.",
		},
		{
			userId: eve.user.id,
			title: "Security Alert",
			message:
				"Unusual activity detected on your account. Please review your recent transactions.",
			isRead: false,
		},
		{
			userId: alice.user.id,
			title: "Withdrawal Confirmed",
			message: "Your ATM withdrawal of $500.00 has been processed.",
		},
	];

	await prisma.notification.createMany({ data: notifications });

	console.log(`  ✅ ${notifications.length} notifications created`);

	// ── 7. Audit Logs ───────────────────────────────────────────────────────
	console.log("\n📋 Creating audit log entries...");

	const auditLogs = createdUsers.map(({ user }) => ({
		userId: user.id,
		action: "auth.signup",
		ipAddress: "127.0.0.1",
		userAgent: "SeedScript/1.0",
	}));

	await prisma.auditLog.createMany({ data: auditLogs });

	// login events
	await prisma.auditLog.createMany({
		data: createdUsers.map(({ user }) => ({
			userId: user.id,
			action: "auth.login",
			ipAddress: "127.0.0.1",
			userAgent: "Mozilla/5.0 (SeedScript)",
		})),
	});

	console.log(`  ✅ ${auditLogs.length * 2} audit log entries created`);

	// ── 8. Scheduled Payment (demo) ─────────────────────────────────────────
	console.log("\n📅 Creating scheduled recurring payment...");

	await prisma.scheduledPayment.create({
		data: {
			userId: alice.user.id,
			senderWalletId: alice.wallet.id,
			receiverAccountNumber: bob.wallet.accountNumber,
			amount: dec(100.0),
			currency: "USD",
			frequency: "MONTHLY",
			nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
			status: "ACTIVE",
		},
	});

	console.log(
		"  ✅ Monthly $100 scheduled payment: alice_finance → bob_trader",
	);

	// ── 9. Outbox events (simulate published events) ─────────────────────────
	console.log("\n📨 Creating outbox event records...");

	await prisma.outbox.createMany({
		data: [
			{
				aggregateType: "Transaction",
				aggregateId: alice.wallet.id,
				eventType: "TRANSACTION_COMPLETED",
				payload: JSON.stringify({
					type: "DEPOSIT",
					amount: "5000.00",
					currency: "USD",
				}),
				status: "PUBLISHED",
				retryCount: 0,
			},
			{
				aggregateType: "Transaction",
				aggregateId: bob.wallet.id,
				eventType: "TRANSACTION_COMPLETED",
				payload: JSON.stringify({
					type: "TRANSFER",
					amount: "750.00",
					currency: "USD",
				}),
				status: "PUBLISHED",
				retryCount: 0,
			},
			{
				aggregateType: "FraudAlert",
				aggregateId: eve.user.id,
				eventType: "FRAUD_ALERT_RAISED",
				payload: JSON.stringify({
					riskScore: 78,
					userId: eve.user.id,
				}),
				status: "PUBLISHED",
				retryCount: 0,
			},
		],
	});

	console.log("  ✅ 3 outbox event records created");

	// ── Done ─────────────────────────────────────────────────────────────────
	console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log("✅ Seed complete! Database is ready for development.\n");
	console.log("📌 Demo Credentials (password: Demo@1234):");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	for (const { user, wallet } of createdUsers) {
		console.log(
			`  👤 ${user.username.padEnd(20)} | 📧 ${user.email.padEnd(35)} | 🏦 ${wallet.accountNumber}`,
		);
	}

	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
