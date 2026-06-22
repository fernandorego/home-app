-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "recurrence" TEXT,
    "dueDate" DATETIME,
    "bought" BOOLEAN NOT NULL DEFAULT false,
    "boughtAt" DATETIME,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ShoppingItem_bought_idx" ON "ShoppingItem"("bought");

-- CreateIndex
CREATE INDEX "ShoppingItem_dueDate_idx" ON "ShoppingItem"("dueDate");

-- CreateIndex
CREATE INDEX "ShoppingItem_userId_idx" ON "ShoppingItem"("userId");
