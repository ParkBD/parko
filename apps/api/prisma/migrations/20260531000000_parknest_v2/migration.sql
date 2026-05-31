-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('DRIVER', 'OWNER', 'SECURITY', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'BANNED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'WITHDRAWAL', 'COIN_PURCHASE', 'BOOKING_PAYMENT', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "CoinPackage" AS ENUM ('STARTER', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ParkingSpaceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ParkingSpaceType" AS ENUM ('OPEN', 'COVERED', 'UNDERGROUND', 'MULTI_LEVEL', 'ROOFTOP');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTORCYCLE', 'CAR', 'SUV', 'TRUCK', 'BUS', 'BICYCLE', 'OTHER');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('REGULAR', 'OVERRIDE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WALLET', 'COINS', 'CARD', 'BKASH', 'NAGAD', 'ROCKET', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "VerificationCodeType" AS ENUM ('EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'CHECK_IN', 'CHECK_OUT', 'TWO_FACTOR', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('BANK_TRANSFER', 'BKASH', 'NAGAD', 'ROCKET');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'CHECK_IN', 'CHECK_OUT', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PAYOUT_PROCESSED', 'REVIEW_RECEIVED', 'ACCOUNT_VERIFIED', 'PASSWORD_RESET', 'PROMOTIONAL', 'SYSTEM', 'SECURITY_ALERT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE', 'ROLE_CHANGE', 'STATUS_CHANGE', 'APPROVE', 'REJECT', 'SUSPEND', 'UNSUSPEND', 'EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('APPROVE_PARKING_SPACE', 'REJECT_PARKING_SPACE', 'SUSPEND_USER', 'UNSUSPEND_USER', 'BAN_USER', 'UNBAN_USER', 'PROCESS_PAYOUT', 'CANCEL_BOOKING', 'ISSUE_REFUND', 'ADJUST_WALLET', 'SEND_NOTIFICATION', 'EXPORT_DATA');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" "RoleType" NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" UUID,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "gender" "Gender",
    "dateOfBirth" TIMESTAMP(3),
    "nationalId" TEXT,
    "drivingLicense" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BD',
    "postalCode" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "coinBalance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "frozenAt" TIMESTAMP(3),
    "frozenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceBefore" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "referenceType" TEXT,
    "referenceId" UUID,
    "description" TEXT,
    "metadata" JSONB,
    "gatewayRef" TEXT,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_purchases" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "package" "CoinPackage" NOT NULL,
    "coinsAmount" INTEGER NOT NULL,
    "priceAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayRef" TEXT,
    "gatewayResponse" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_spaces" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "spaceType" "ParkingSpaceType" NOT NULL DEFAULT 'OPEN',
    "status" "ParkingSpaceStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "totalSlots" INTEGER NOT NULL,
    "availableSlots" INTEGER NOT NULL,
    "pricePerHour" DECIMAL(10,2) NOT NULL,
    "pricePerDay" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BD',
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "vehicleTypes" "VehicleType"[],
    "rules" TEXT,
    "instructions" TEXT,
    "isInstantBook" BOOLEAN NOT NULL DEFAULT false,
    "minBookingHours" INTEGER NOT NULL DEFAULT 1,
    "maxBookingHours" INTEGER NOT NULL DEFAULT 24,
    "advanceBookingHours" INTEGER NOT NULL DEFAULT 24,
    "cancellationPolicy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" UUID,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" UUID,
    "rejectionReason" TEXT,
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "parking_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_images" (
    "id" UUID NOT NULL,
    "spaceId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "parking_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_polygons" (
    "id" UUID NOT NULL,
    "spaceId" UUID NOT NULL,
    "coordinates" JSONB NOT NULL,
    "areaSqMeters" DOUBLE PRECISION,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "zoomLevel" INTEGER NOT NULL DEFAULT 18,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_polygons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_availability" (
    "id" UUID NOT NULL,
    "spaceId" UUID NOT NULL,
    "type" "AvailabilityType" NOT NULL DEFAULT 'REGULAR',
    "dayOfWeek" "DayOfWeek",
    "date" DATE,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "slotOverride" INTEGER,
    "priceOverride" DECIMAL(10,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "driverId" UUID NOT NULL,
    "spaceId" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'CAR',
    "baseAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "coinsUsed" INTEGER NOT NULL DEFAULT 0,
    "coinDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "checkInCode" TEXT,
    "checkOutCode" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "checkedInBy" UUID,
    "checkedOutBy" UUID,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" UUID,
    "disputeReason" TEXT,
    "disputedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "changedBy" UUID,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookingId" UUID,
    "type" "VerificationCodeType" NOT NULL,
    "code" TEXT NOT NULL,
    "token" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_contacts" (
    "id" UUID NOT NULL,
    "spaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "security_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_payouts" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "method" "PayoutMethod" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "routingNumber" TEXT,
    "mobileNumber" TEXT,
    "notes" TEXT,
    "gatewayRef" TEXT,
    "gatewayResponse" JSONB,
    "processedAt" TIMESTAMP(3),
    "processedBy" UUID,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "spaceId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "cleanlinessRating" INTEGER,
    "accessRating" INTEGER,
    "safetyRating" INTEGER,
    "valueRating" INTEGER,
    "comment" TEXT,
    "ownerResponse" TEXT,
    "ownerResponseAt" TIMESTAMP(3),
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "subjectId" UUID,
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "type" "AdminActionType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "user_role_assignments_userId_idx" ON "user_role_assignments"("userId");

-- CreateIndex
CREATE INDEX "user_role_assignments_roleId_idx" ON "user_role_assignments"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_userId_roleId_key" ON "user_role_assignments"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_nationalId_key" ON "profiles"("nationalId");

-- CreateIndex
CREATE INDEX "profiles_userId_idx" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions"("type");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_idx" ON "wallet_transactions"("status");

-- CreateIndex
CREATE INDEX "wallet_transactions_referenceType_referenceId_idx" ON "wallet_transactions"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "wallet_transactions_createdAt_idx" ON "wallet_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "coin_purchases_walletId_idx" ON "coin_purchases"("walletId");

-- CreateIndex
CREATE INDEX "coin_purchases_paymentStatus_idx" ON "coin_purchases"("paymentStatus");

-- CreateIndex
CREATE INDEX "coin_purchases_createdAt_idx" ON "coin_purchases"("createdAt");

-- CreateIndex
CREATE INDEX "parking_spaces_ownerId_idx" ON "parking_spaces"("ownerId");

-- CreateIndex
CREATE INDEX "parking_spaces_status_idx" ON "parking_spaces"("status");

-- CreateIndex
CREATE INDEX "parking_spaces_city_idx" ON "parking_spaces"("city");

-- CreateIndex
CREATE INDEX "parking_spaces_latitude_longitude_idx" ON "parking_spaces"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "parking_spaces_deletedAt_idx" ON "parking_spaces"("deletedAt");

-- CreateIndex
CREATE INDEX "parking_images_spaceId_idx" ON "parking_images"("spaceId");

-- CreateIndex
CREATE INDEX "parking_images_isPrimary_idx" ON "parking_images"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "parking_polygons_spaceId_key" ON "parking_polygons"("spaceId");

-- CreateIndex
CREATE INDEX "parking_availability_spaceId_idx" ON "parking_availability"("spaceId");

-- CreateIndex
CREATE INDEX "parking_availability_type_idx" ON "parking_availability"("type");

-- CreateIndex
CREATE INDEX "parking_availability_dayOfWeek_idx" ON "parking_availability"("dayOfWeek");

-- CreateIndex
CREATE INDEX "parking_availability_date_idx" ON "parking_availability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingRef_key" ON "bookings"("bookingRef");

-- CreateIndex
CREATE INDEX "bookings_driverId_idx" ON "bookings"("driverId");

-- CreateIndex
CREATE INDEX "bookings_spaceId_idx" ON "bookings"("spaceId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_paymentStatus_idx" ON "bookings"("paymentStatus");

-- CreateIndex
CREATE INDEX "bookings_startTime_endTime_idx" ON "bookings"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "bookings_bookingRef_idx" ON "bookings"("bookingRef");

-- CreateIndex
CREATE INDEX "bookings_deletedAt_idx" ON "bookings"("deletedAt");

-- CreateIndex
CREATE INDEX "booking_status_history_bookingId_idx" ON "booking_status_history"("bookingId");

-- CreateIndex
CREATE INDEX "booking_status_history_createdAt_idx" ON "booking_status_history"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "verification_codes_token_key" ON "verification_codes"("token");

-- CreateIndex
CREATE INDEX "verification_codes_userId_idx" ON "verification_codes"("userId");

-- CreateIndex
CREATE INDEX "verification_codes_code_type_idx" ON "verification_codes"("code", "type");

-- CreateIndex
CREATE INDEX "verification_codes_token_idx" ON "verification_codes"("token");

-- CreateIndex
CREATE INDEX "verification_codes_expiresAt_idx" ON "verification_codes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "security_contacts_userId_key" ON "security_contacts"("userId");

-- CreateIndex
CREATE INDEX "security_contacts_spaceId_idx" ON "security_contacts"("spaceId");

-- CreateIndex
CREATE INDEX "security_contacts_userId_idx" ON "security_contacts"("userId");

-- CreateIndex
CREATE INDEX "owner_payouts_walletId_idx" ON "owner_payouts"("walletId");

-- CreateIndex
CREATE INDEX "owner_payouts_status_idx" ON "owner_payouts"("status");

-- CreateIndex
CREATE INDEX "owner_payouts_createdAt_idx" ON "owner_payouts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_spaceId_idx" ON "reviews"("spaceId");

-- CreateIndex
CREATE INDEX "reviews_authorId_idx" ON "reviews"("authorId");

-- CreateIndex
CREATE INDEX "reviews_targetId_idx" ON "reviews"("targetId");

-- CreateIndex
CREATE INDEX "reviews_overallRating_idx" ON "reviews"("overallRating");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_subjectId_idx" ON "audit_logs"("subjectId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_actions_adminId_idx" ON "admin_actions"("adminId");

-- CreateIndex
CREATE INDEX "admin_actions_type_idx" ON "admin_actions"("type");

-- CreateIndex
CREATE INDEX "admin_actions_entityType_entityId_idx" ON "admin_actions"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "admin_actions_createdAt_idx" ON "admin_actions"("createdAt");

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_purchases" ADD CONSTRAINT "coin_purchases_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_spaces" ADD CONSTRAINT "parking_spaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_images" ADD CONSTRAINT "parking_images_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "parking_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_polygons" ADD CONSTRAINT "parking_polygons_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "parking_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_availability" ADD CONSTRAINT "parking_availability_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "parking_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "parking_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_contacts" ADD CONSTRAINT "security_contacts_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "parking_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_contacts" ADD CONSTRAINT "security_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_payouts" ADD CONSTRAINT "owner_payouts_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "parking_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

