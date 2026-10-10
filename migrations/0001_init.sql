-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Hacker" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "team" TEXT,
    "country" TEXT,
    "avatarColor" TEXT NOT NULL DEFAULT '#22c55e',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "totalHits" INTEGER NOT NULL DEFAULT 0,
    "badges" TEXT NOT NULL DEFAULT '[]',
    "bio" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hacker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defacement" (
    "id" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "attackerId" TEXT NOT NULL,
    "mirrorUrl" TEXT,
    "note" TEXT,
    "poc" TEXT,
    "reason" TEXT,
    "isHomepage" BOOLEAN NOT NULL DEFAULT false,
    "isMass" BOOLEAN NOT NULL DEFAULT false,
    "isRedeface" BOOLEAN NOT NULL DEFAULT false,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "pendingUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'archived',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Defacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stat" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hacker_handle_key" ON "Hacker"("handle");

-- CreateIndex
CREATE INDEX "Defacement_attackerId_idx" ON "Defacement"("attackerId");

-- CreateIndex
CREATE INDEX "Defacement_country_idx" ON "Defacement"("country");

-- CreateIndex
CREATE INDEX "Defacement_createdAt_idx" ON "Defacement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Stat_key_key" ON "Stat"("key");

-- AddForeignKey
ALTER TABLE "Defacement" ADD CONSTRAINT "Defacement_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "Hacker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

