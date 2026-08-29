-- CreateEnum
CREATE TYPE "IncomeTypeSign" AS ENUM ('ADD', 'SUBTRACT');

-- AlterTable
ALTER TABLE "IncomeSourceType" ADD COLUMN     "sign" "IncomeTypeSign" NOT NULL DEFAULT 'ADD';
