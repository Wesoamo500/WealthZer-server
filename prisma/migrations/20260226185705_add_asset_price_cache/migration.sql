-- CreateTable
CREATE TABLE "asset_prices" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_prices_symbol_type_fetchedAt_idx" ON "asset_prices"("symbol", "type", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "asset_prices_symbol_type_key" ON "asset_prices"("symbol", "type");
