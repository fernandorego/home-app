-- CreateEnum
CREATE TYPE "ListCategoryKind" AS ENUM ('TASK', 'SHOPPING');

-- AlterTable
ALTER TABLE "ShoppingItem" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "ListCategory" (
    "id" TEXT NOT NULL,
    "kind" "ListCategoryKind" NOT NULL,
    "name" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListCategory_kind_name_key" ON "ListCategory"("kind", "name");

-- CreateIndex
CREATE INDEX "ShoppingItem_categoryId_idx" ON "ShoppingItem"("categoryId");

-- CreateIndex
CREATE INDEX "Task_categoryId_idx" ON "Task"("categoryId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ListCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ListCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
