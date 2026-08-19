-- CreateEnum
CREATE TYPE "CoverflexStatus" AS ENUM ('RECEIPT', 'WAITING', 'PAID');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "coverflexStatus" "CoverflexStatus" NOT NULL DEFAULT 'RECEIPT';
