-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "editId" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Program_editId_key" ON "Program"("editId");

-- CreateIndex
CREATE UNIQUE INDEX "Program_viewId_key" ON "Program"("viewId");

