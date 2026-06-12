-- GDU Staff Management & Intelligence Portal
-- Complete MySQL Database Schema for cPanel Hosting
-- Filename: gdu_portal_database.sql

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `profiles`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `permissions`;
DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `staff_records`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `allowances`;
DROP TABLE IF EXISTS `monthly_allowance_settings`;
DROP TABLE IF EXISTS `monthly_allowance_requests`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `organogram`;
DROP TABLE IF EXISTS `portal_branding_settings`;
DROP TABLE IF EXISTS `branding_settings`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `email_verification_tokens`;
DROP TABLE IF EXISTS `smtp_settings`;
DROP TABLE IF EXISTS `email_templates`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Roles
CREATE TABLE `roles` (
    `id` VARCHAR(255) PRIMARY KEY,
    `name` VARCHAR(255) UNIQUE NOT NULL,
    `slug` VARCHAR(255) UNIQUE NOT NULL,
    `description` TEXT,
    `status` VARCHAR(50) DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Profiles (Auth users)
CREATE TABLE `profiles` (
    `id` VARCHAR(255) PRIMARY KEY,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `full_name` VARCHAR(255),
    `role` VARCHAR(50) DEFAULT 'staff',
    `is_active` BOOLEAN DEFAULT TRUE,
    `avatar_url` VARCHAR(500) DEFAULT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Departments
CREATE TABLE `departments` (
    `id` VARCHAR(255) PRIMARY KEY,
    `name` VARCHAR(255) UNIQUE NOT NULL,
    `code` VARCHAR(50) DEFAULT NULL,
    `description` TEXT,
    `head_of_department_id` VARCHAR(255) DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'active',
    `created_by` VARCHAR(255) DEFAULT NULL,
    `updated_by` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Staff Records
CREATE TABLE `staff_records` (
    `id` VARCHAR(255) PRIMARY KEY,
    `user_id` VARCHAR(255) DEFAULT NULL,
    `readable_id` VARCHAR(100) UNIQUE DEFAULT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `phone` VARCHAR(50) DEFAULT NULL,
    `role` VARCHAR(50) DEFAULT 'staff',
    `department_id` VARCHAR(255) DEFAULT NULL,
    `position` VARCHAR(255) DEFAULT NULL,
    `grade_level` INT DEFAULT NULL,
    `step` INT DEFAULT NULL,
    `passport_url` VARCHAR(500) DEFAULT NULL,
    `passport_photo` VARCHAR(500) DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'active',
    `gender` VARCHAR(20) DEFAULT NULL,
    `date_of_birth` DATE DEFAULT NULL,
    `qualification` VARCHAR(255) DEFAULT NULL,
    `employment_date` DATE DEFAULT NULL,
    `retirement_date` DATE DEFAULT NULL,
    `adhoc_expiry` DATE DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `next_of_kin_name` VARCHAR(255) DEFAULT NULL,
    `next_of_kin_phone` VARCHAR(50) DEFAULT NULL,
    `next_of_kin_rel` VARCHAR(100) DEFAULT NULL,
    `account_name` VARCHAR(255) DEFAULT NULL,
    `bank_name` VARCHAR(255) DEFAULT NULL,
    `account_number` VARCHAR(50) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Attendance (Handles daily record & summary values)
CREATE TABLE `attendance` (
    `id` VARCHAR(255) PRIMARY KEY,
    `staff_id` VARCHAR(255) NOT NULL,
    `date` DATE DEFAULT NULL,
    `check_in` VARCHAR(50) DEFAULT NULL,
    `check_out` VARCHAR(50) DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'absent',
    `method` VARCHAR(50) DEFAULT 'manual',
    `notes` TEXT DEFAULT NULL,
    `verified` BOOLEAN DEFAULT FALSE,
    `verified_by` VARCHAR(255) DEFAULT NULL,
    `verified_at` VARCHAR(50) DEFAULT NULL,
    `approved` BOOLEAN DEFAULT FALSE,
    `approved_by` VARCHAR(255) DEFAULT NULL,
    `approved_at` VARCHAR(50) DEFAULT NULL,
    -- Monthly Attendance Summaries fields
    `month` INT DEFAULT NULL,
    `year` INT DEFAULT NULL,
    `attendance_percentage` INT DEFAULT NULL,
    `present_days` INT DEFAULT NULL,
    `absent_days` INT DEFAULT NULL,
    `late_days` INT DEFAULT NULL,
    `submitted_by` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`staff_id`) REFERENCES `staff_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Messages (Chat)
CREATE TABLE `messages` (
    `id` VARCHAR(255) PRIMARY KEY,
    `sender_id` VARCHAR(255) NOT NULL,
    `receiver_id` VARCHAR(255) DEFAULT NULL,
    `group_id` VARCHAR(255) DEFAULT NULL,
    `content` TEXT DEFAULT NULL,
    `attachment_url` VARCHAR(500) DEFAULT NULL,
    `attachment_type` VARCHAR(50) DEFAULT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`sender_id`) REFERENCES `staff_records`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`receiver_id`) REFERENCES `staff_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Announcements
CREATE TABLE `announcements` (
    `id` VARCHAR(255) PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `author_id` VARCHAR(255) DEFAULT NULL,
    `is_pinned` BOOLEAN DEFAULT FALSE,
    `target_department_id` VARCHAR(255) DEFAULT NULL,
    `expires_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`author_id`) REFERENCES `staff_records`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`target_department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Allowances (Staff manual allowance records)
CREATE TABLE `allowances` (
    `id` VARCHAR(255) PRIMARY KEY,
    `staff_id` VARCHAR(255) NOT NULL,
    `allowance_type` VARCHAR(100) DEFAULT 'Monthly Allowance',
    `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `month` INT NOT NULL,
    `year` INT NOT NULL,
    `payment_status` VARCHAR(50) DEFAULT 'pending', -- pending, processing, paid, not approved
    `payment_date` DATE DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`staff_id`) REFERENCES `staff_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Monthly Allowance Settings
CREATE TABLE `monthly_allowance_settings` (
    `id` VARCHAR(255) PRIMARY KEY,
    `month` INT NOT NULL,
    `year` INT NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `attendance_threshold` INT DEFAULT 80,
    `eligible_roles` TEXT DEFAULT NULL, -- Comma-separated slug values
    `eligible_departments` TEXT DEFAULT NULL, -- Comma-separated department IDs
    `status` VARCHAR(50) DEFAULT 'active',
    `set_by` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `month_year` (`month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Monthly Allowance Requests
CREATE TABLE `monthly_allowance_requests` (
    `id` VARCHAR(255) PRIMARY KEY,
    `staff_id` VARCHAR(255) NOT NULL,
    `department_id` VARCHAR(255) DEFAULT NULL,
    `role_id` VARCHAR(255) DEFAULT NULL,
    `month` INT NOT NULL,
    `year` INT NOT NULL,
    `attendance_percentage` INT NOT NULL,
    `allowance_amount` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(50) DEFAULT 'Processing', -- Not Requested, Processing, Approved, Paid, Rejected
    `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `reviewed_by` VARCHAR(255) DEFAULT NULL,
    `reviewed_at` VARCHAR(50) DEFAULT NULL,
    `paid_at` VARCHAR(50) DEFAULT NULL,
    `rejection_reason` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`staff_id`) REFERENCES `staff_records`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `staff_month_year` (`staff_id`, `month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Documents
CREATE TABLE `documents` (
    `id` VARCHAR(255) PRIMARY KEY,
    `staff_id` VARCHAR(255) DEFAULT NULL,
    `name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `file_size` VARCHAR(50) DEFAULT NULL,
    `file_type` VARCHAR(100) DEFAULT NULL,
    `category` VARCHAR(100) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`staff_id`) REFERENCES `staff_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Organogram
CREATE TABLE `organogram` (
    `id` VARCHAR(255) PRIMARY KEY,
    `staff_id` VARCHAR(255) DEFAULT NULL,
    `title` VARCHAR(255) NOT NULL,
    `staff_name` VARCHAR(255) DEFAULT NULL,
    `department_name` VARCHAR(255) DEFAULT NULL,
    `role` VARCHAR(255) DEFAULT NULL,
    `parent_id` VARCHAR(255) DEFAULT NULL,
    `position` TEXT DEFAULT NULL, -- Holds JSON coordinates
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`staff_id`) REFERENCES `staff_records`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. System Portal Branding Settings
CREATE TABLE `portal_branding_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `portal_name` VARCHAR(255) DEFAULT 'GDU Staff Portal',
    `logo_url` VARCHAR(500) DEFAULT NULL,
    `logo_url_2` VARCHAR(500) DEFAULT NULL,
    `logo_url_3` VARCHAR(500) DEFAULT NULL,
    `favicon_url` VARCHAR(500) DEFAULT NULL,
    `login_background_url` VARCHAR(500) DEFAULT NULL,
    `login_bg_url` VARCHAR(500) DEFAULT NULL,
    `primary_color` VARCHAR(50) DEFAULT '#1e3a8a',
    `secondary_color` VARCHAR(50) DEFAULT '#b45309',
    `login_title` VARCHAR(255) DEFAULT 'GDU staff Login section',
    `login_subtitle` VARCHAR(255) DEFAULT 'Access and manage the Government Delivery Unit administration system.',
    `hero_title` VARCHAR(255) DEFAULT 'GOVERNMENT DELIVERY UNIT (GDU)',
    `hero_subtitle` VARCHAR(255) DEFAULT 'KOGI STATE GOVERNMENT',
    `hero_tagline` VARCHAR(255) DEFAULT '…Confluence of Opportunities',
    `footer_text` VARCHAR(255) DEFAULT '© 2026 Kogi State Government. All rights reserved.',
    `created_by` VARCHAR(255) DEFAULT NULL,
    `updated_by` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Branding settings (legacy table support)
CREATE TABLE `branding_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `portal_name` VARCHAR(255) DEFAULT 'GDU Staff Portal',
    `logo_url_2` VARCHAR(500) DEFAULT NULL,
    `logo_url_3` VARCHAR(500) DEFAULT NULL,
    `hero_title` VARCHAR(255) DEFAULT 'GOVERNMENT DELIVERY UNIT (GDU)',
    `hero_subtitle` VARCHAR(255) DEFAULT 'KOGI STATE GOVERNMENT',
    `hero_tagline` VARCHAR(255) DEFAULT '…Confluence of Opportunities',
    `login_bg_url` VARCHAR(500) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Audit Logs
CREATE TABLE `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(255) DEFAULT NULL,
    `action` VARCHAR(255) NOT NULL,
    `details` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Password Reset Tokens
CREATE TABLE `password_reset_tokens` (
    `email` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) PRIMARY KEY,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Email Verification Tokens
CREATE TABLE `email_verification_tokens` (
    `email` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) PRIMARY KEY,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. SMTP Settings
CREATE TABLE `smtp_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `host` VARCHAR(255) DEFAULT NULL,
    `port` INT DEFAULT 587,
    `username` VARCHAR(255) DEFAULT NULL,
    `password` VARCHAR(255) DEFAULT NULL,
    `sender_email` VARCHAR(255) DEFAULT NULL,
    `sender_name` VARCHAR(255) DEFAULT NULL,
    `encryption` VARCHAR(50) DEFAULT 'TLS', -- SSL, TLS, None
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Email Templates
CREATE TABLE `email_templates` (
    `id` VARCHAR(100) PRIMARY KEY,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seeding Default Roles
INSERT INTO `roles` (`id`, `name`, `slug`, `description`, `status`) VALUES
('r1', 'Super Admin', 'super_admin', 'Full system access', 'active'),
('r2', 'Admin', 'admin', 'Manage staff and departments', 'active'),
('r3', 'Accountant', 'accounts', 'Manage payroll and allowances', 'active'),
('r4', 'ICT Support', 'ict', 'Technical settings and branding', 'active'),
('r5', 'Director General', 'dg', 'Director General - oversight summaries', 'active'),
('r6', 'Technical Assistant', 'technical_assistant', 'Technical Assistant - oversight summaries', 'active'),
('r7', 'Staff', 'staff', 'General staff access', 'active'),
('r8', 'Adhoc Staff', 'adhoc', 'Temporary/Adhoc staff access', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Seeding Default Departments
INSERT INTO `departments` (`id`, `name`, `code`, `description`, `status`) VALUES
('d1', 'Administration', 'ADMIN', 'General administration department', 'active'),
('d2', 'Finance and Accounts', 'FIN', 'Payroll, allowances and accounting', 'active'),
('d3', 'ICT & Operations', 'ICT', 'Information and communication technology', 'active'),
('d4', 'Strategy & Delivery', 'STRAT', 'Monitoring and evaluations operations', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Seeding Default Branding
INSERT INTO `portal_branding_settings` (`id`, `portal_name`) VALUES (1, 'GDU Staff Portal') ON DUPLICATE KEY UPDATE `portal_name` = VALUES(`portal_name`);
INSERT INTO `branding_settings` (`id`, `portal_name`) VALUES (1, 'GDU Staff Portal') ON DUPLICATE KEY UPDATE `portal_name` = VALUES(`portal_name`);
INSERT INTO `smtp_settings` (`id`) VALUES (1) ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);

-- Seeding Default Super Admin Account
-- Email: admin@gdu.gov.ng
-- Password: GDU@123
-- Password hash generated using PHP's password_hash('GDU@123', PASSWORD_DEFAULT)
INSERT INTO `profiles` (`id`, `email`, `full_name`, `role`, `is_active`, `password_hash`) VALUES
('sa1', 'admin@gdu.gov.ng', 'Super Admin', 'super_admin', 1, '$2y$10$WpZ6G9Y3u/t31qYy5T6Z2u7.iR3Zq7dI23/R297v5hEw7fXv9K6X6') -- hash of GDU@123
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

INSERT INTO `staff_records` (`id`, `user_id`, `readable_id`, `full_name`, `email`, `role`, `department_id`, `position`) VALUES
('sr_sa1', 'sa1', 'GDU001', 'Super Admin', 'admin@gdu.gov.ng', 'super_admin', 'd3', 'Chief Operations Officer')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);
