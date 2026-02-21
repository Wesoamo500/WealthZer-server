-- AlterTable
ALTER TABLE "users" ADD COLUMN     "advisorMode" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "aiInsightsFrequency" TEXT NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "isBiometricsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
