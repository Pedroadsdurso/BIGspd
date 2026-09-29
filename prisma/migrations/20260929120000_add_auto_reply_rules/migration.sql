-- CreateEnum
CREATE TYPE "AutoReplyMatch" AS ENUM ('CONTAINS', 'EXACT');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "auto_reply_rule_id" TEXT;

-- CreateTable
CREATE TABLE "auto_reply_rules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "match_type" "AutoReplyMatch" NOT NULL DEFAULT 'CONTAINS',
    "reply_text" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "cooldown_minutes" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_reply_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auto_reply_rules_user_id_active_idx" ON "auto_reply_rules"("user_id", "active");

-- CreateIndex
CREATE INDEX "messages_auto_reply_rule_id_contact_id_created_at_idx" ON "messages"("auto_reply_rule_id", "contact_id", "created_at");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_auto_reply_rule_id_fkey" FOREIGN KEY ("auto_reply_rule_id") REFERENCES "auto_reply_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_reply_rules" ADD CONSTRAINT "auto_reply_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
