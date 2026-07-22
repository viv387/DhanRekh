import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/money_ledger",
  },
});