-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "reimbursedAt" DATETIME;
ALTER TABLE "Expense" ADD COLUMN "reimbursementAmount" DECIMAL;
ALTER TABLE "Expense" ADD COLUMN "reimburser" TEXT;

-- CreateIndex
CREATE INDEX "Expense_reimbursedAt_idx" ON "Expense"("reimbursedAt");
