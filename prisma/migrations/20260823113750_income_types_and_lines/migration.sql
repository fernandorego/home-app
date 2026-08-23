/*
  Warnings:

  - You are about to drop the column `isencaoHorario` on the `IncomeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `isencaoHorarioFerias` on the `IncomeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `subFerias` on the `IncomeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `subsidioNatal` on the `IncomeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `vencimento` on the `IncomeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `walletCoverflex` on the `IncomeEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "IncomeEntry" DROP COLUMN "isencaoHorario",
DROP COLUMN "isencaoHorarioFerias",
DROP COLUMN "subFerias",
DROP COLUMN "subsidioNatal",
DROP COLUMN "vencimento",
DROP COLUMN "walletCoverflex";

-- CreateTable
CREATE TABLE "IncomeSourceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "irsPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ssPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "requiresNote" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeSourceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeLine" (
    "id" TEXT NOT NULL,
    "grossAmount" DECIMAL(65,30) NOT NULL,
    "irsPct" DECIMAL(65,30) NOT NULL,
    "ssPct" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "incomeEntryId" TEXT NOT NULL,
    "sourceTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncomeSourceType_name_key" ON "IncomeSourceType"("name");

-- CreateIndex
CREATE INDEX "IncomeLine_incomeEntryId_idx" ON "IncomeLine"("incomeEntryId");

-- CreateIndex
CREATE INDEX "IncomeLine_sourceTypeId_idx" ON "IncomeLine"("sourceTypeId");

-- AddForeignKey
ALTER TABLE "IncomeLine" ADD CONSTRAINT "IncomeLine_incomeEntryId_fkey" FOREIGN KEY ("incomeEntryId") REFERENCES "IncomeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeLine" ADD CONSTRAINT "IncomeLine_sourceTypeId_fkey" FOREIGN KEY ("sourceTypeId") REFERENCES "IncomeSourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
