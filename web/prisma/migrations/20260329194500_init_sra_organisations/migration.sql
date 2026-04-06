-- CreateTable
CREATE TABLE `sra_organisations` (
    `id` VARCHAR(128) NOT NULL,
    `sra_id` VARCHAR(64) NOT NULL,
    `business_name` VARCHAR(512) NOT NULL,
    `search_text` LONGTEXT NOT NULL,
    `city` VARCHAR(255) NOT NULL,
    `postcode` VARCHAR(32) NOT NULL,
    `county` VARCHAR(255) NOT NULL,
    `country` VARCHAR(128) NOT NULL,
    `sra_profile_url` VARCHAR(2048) NOT NULL,
    `source` VARCHAR(16) NOT NULL DEFAULT 'sra',
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sra_organisations_sra_id_key`(`sra_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
