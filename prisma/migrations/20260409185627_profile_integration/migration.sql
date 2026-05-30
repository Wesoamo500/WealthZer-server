-- AlterTable
ALTER TABLE "users" ADD COLUMN     "budgetAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "darkMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'English',
ADD COLUMN     "priceAlerts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proExpiresAt" TIMESTAMP(3),
ADD COLUMN     "weeklyReport" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "preferredCurrency" SET DEFAULT 'USD';
