-- AlterTable
ALTER TABLE "UsageRecord" ADD COLUMN     "cacheSavings" DECIMAL(12,8) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ResearchCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "providerKeyId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cachedInputTokens" INTEGER NOT NULL,
    "reasoningTokens" INTEGER NOT NULL,
    "cost" DECIMAL(12,8) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchCache_cacheKey_key" ON "ResearchCache"("cacheKey");

-- CreateIndex
CREATE INDEX "ResearchCache_expiresAt_idx" ON "ResearchCache"("expiresAt");

-- CreateIndex
CREATE INDEX "ApiRateLimit_resetAt_idx" ON "ApiRateLimit"("resetAt");

-- AddForeignKey
ALTER TABLE "ResearchCache" ADD CONSTRAINT "ResearchCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchCache" ADD CONSTRAINT "ResearchCache_providerKeyId_fkey" FOREIGN KEY ("providerKeyId") REFERENCES "ProviderKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
