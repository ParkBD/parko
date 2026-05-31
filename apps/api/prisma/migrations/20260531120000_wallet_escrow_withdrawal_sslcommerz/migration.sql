-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentGatewayStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

-- AlterEnum: add new values to WalletTransactionType
ALTER TYPE "WalletTransactionType" ADD VALUE 'TOP_UP';
ALTER TYPE "WalletTransactionType" ADD VALUE 'ESCROW_HOLD';
ALTER TYPE "WalletTransactionType" ADD VALUE 'ESCROW_RELEASE';
ALTER TYPE "WalletTransactionType" ADD VALUE 'COMMISSION';

-- AlterTable: add escrowBalance and pendingWithdraw to wallets
ALTER TABLE "wallets"
  ADD COLUMN "escrowBalance"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pendingWithdraw" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: parking_lot_geo (was in schema but not migrated)
CREATE TABLE "parking_lot_geo" (
    "id"        UUID NOT NULL,
    "lotId"     UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parking_lot_geo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "parking_lot_geo_lotId_key" ON "parking_lot_geo"("lotId");

-- CreateTable: payment_gateway_txns
CREATE TABLE "payment_gateway_txns" (
    "id"            UUID NOT NULL,
    "userId"        UUID NOT NULL,
    "walletId"      UUID NOT NULL,
    "amount"        DECIMAL(10,2) NOT NULL,
    "coinsToCredit" INTEGER NOT NULL,
    "status"        "PaymentGatewayStatus" NOT NULL DEFAULT 'INITIATED',
    "tranId"        TEXT NOT NULL,
    "sessionKey"    TEXT,
    "valId"         TEXT,
    "bankTranId"    TEXT,
    "cardType"      TEXT,
    "ipnPayload"    JSONB,
    "failReason"    TEXT,
    "initiatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"   TIMESTAMP(3),
    CONSTRAINT "payment_gateway_txns_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_gateway_txns_tranId_key" ON "payment_gateway_txns"("tranId");
CREATE INDEX "payment_gateway_txns_userId_idx"  ON "payment_gateway_txns"("userId");
CREATE INDEX "payment_gateway_txns_status_idx"  ON "payment_gateway_txns"("status");
CREATE INDEX "payment_gateway_txns_tranId_idx"  ON "payment_gateway_txns"("tranId");

-- CreateTable: escrows
CREATE TABLE "escrows" (
    "id"            UUID NOT NULL,
    "bookingId"     UUID NOT NULL,
    "driverId"      UUID NOT NULL,
    "ownerId"       UUID NOT NULL,
    "totalCoins"    INTEGER NOT NULL,
    "platformFee"   INTEGER NOT NULL,
    "ownerEarnings" INTEGER NOT NULL,
    "refundedCoins" INTEGER NOT NULL DEFAULT 0,
    "status"        "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "heldAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt"    TIMESTAMP(3),
    "refundedAt"    TIMESTAMP(3),
    CONSTRAINT "escrows_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "escrows_bookingId_key" ON "escrows"("bookingId");
CREATE INDEX "escrows_driverId_idx" ON "escrows"("driverId");
CREATE INDEX "escrows_ownerId_idx"  ON "escrows"("ownerId");
CREATE INDEX "escrows_status_idx"   ON "escrows"("status");

-- CreateTable: withdrawal_requests
CREATE TABLE "withdrawal_requests" (
    "id"              UUID NOT NULL,
    "userId"          UUID NOT NULL,
    "walletId"        UUID NOT NULL,
    "amount"          INTEGER NOT NULL,
    "status"          "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "method"          TEXT NOT NULL,
    "accountDetails"  JSONB NOT NULL,
    "adminNote"       TEXT,
    "rejectionReason" TEXT,
    "reviewedBy"      UUID,
    "processedAt"     TIMESTAMP(3),
    "completedAt"     TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "withdrawal_requests_userId_idx"    ON "withdrawal_requests"("userId");
CREATE INDEX "withdrawal_requests_status_idx"    ON "withdrawal_requests"("status");
CREATE INDEX "withdrawal_requests_createdAt_idx" ON "withdrawal_requests"("createdAt");

-- AddForeignKeys: payment_gateway_txns
ALTER TABLE "payment_gateway_txns"
  ADD CONSTRAINT "payment_gateway_txns_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_gateway_txns_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKeys: escrows
ALTER TABLE "escrows"
  ADD CONSTRAINT "escrows_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "escrows_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "escrows_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKeys: withdrawal_requests
ALTER TABLE "withdrawal_requests"
  ADD CONSTRAINT "withdrawal_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "withdrawal_requests_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "withdrawal_requests_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
