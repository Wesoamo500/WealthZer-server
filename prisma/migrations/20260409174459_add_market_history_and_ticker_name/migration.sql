-- AlterTable
ALTER TABLE "asset_prices" ADD COLUMN     "change24h" DECIMAL(65,30),
ADD COLUMN     "changePercent24h" DECIMAL(65,30),
ADD COLUMN     "color" TEXT,
ADD COLUMN     "marketCap" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "sparkline7d" TEXT,
ADD COLUMN     "volume24h" TEXT;

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_history" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watchlists_userId_symbol_type_key" ON "watchlists"("userId", "symbol", "type");

-- CreateIndex
CREATE INDEX "market_history_symbol_type_timestamp_idx" ON "market_history"("symbol", "type", "timestamp");

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
