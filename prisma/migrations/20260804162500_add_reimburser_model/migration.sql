-- CreateTable
CREATE TABLE "Reimburser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reimburser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reimburser_name_key" ON "Reimburser"("name");

-- Seed the default reimburser options
INSERT INTO "Reimburser" ("id", "name", "createdAt", "updatedAt") VALUES
  ('reimburser-multicare', 'Multicare', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reimburser-porta65', 'Porta 65', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reimburser-pais', 'Pais', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reimburser-cris', 'Cris', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reimburser-nando', 'Nando', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reimburser-outro', 'Outro', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
