-- CreateTable
CREATE TABLE "IncomeEntry" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "vencimento" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isencaoHorario" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "subFerias" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isencaoHorarioFerias" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "subsidioNatal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "walletCoverflex" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncomeEntry_month_idx" ON "IncomeEntry"("month");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeEntry_userId_month_key" ON "IncomeEntry"("userId", "month");

-- AddForeignKey
ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
