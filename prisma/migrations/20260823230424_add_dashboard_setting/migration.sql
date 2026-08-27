-- CreateTable
CREATE TABLE "DashboardSetting" (
    "id" TEXT NOT NULL,
    "expensesIncomePct" DECIMAL(65,30) NOT NULL DEFAULT 0.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardSetting_pkey" PRIMARY KEY ("id")
);
