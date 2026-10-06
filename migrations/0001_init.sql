PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "Hacker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "handle" TEXT NOT NULL,
    "team" TEXT,
    "country" TEXT,
    "avatarColor" TEXT NOT NULL DEFAULT '#22c55e',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "totalHits" INTEGER NOT NULL DEFAULT 0,
    "badges" TEXT NOT NULL DEFAULT '[]',
    "bio" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Defacement" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "pendingUntil" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'archived',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Defacement_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "Hacker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Stat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "News" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Hacker_handle_key" ON "Hacker"("handle");
CREATE INDEX IF NOT EXISTS "Defacement_attackerId_idx" ON "Defacement"("attackerId");
CREATE INDEX IF NOT EXISTS "Defacement_country_idx" ON "Defacement"("country");
CREATE INDEX IF NOT EXISTS "Defacement_createdAt_idx" ON "Defacement"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Stat_key_key" ON "Stat"("key");
