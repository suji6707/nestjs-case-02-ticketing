-- CreateTable
CREATE TABLE `payment_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_tx_id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `seat_id` INTEGER NOT NULL,
    `status` TINYINT NOT NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `last_failure_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_transactions_user_id_seat_id_idx`(`user_id`, `seat_id`),
    UNIQUE INDEX `payment_transactions_payment_tx_id_key`(`payment_tx_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
