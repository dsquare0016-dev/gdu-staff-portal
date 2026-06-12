<?php
/**
 * GDU Staff Management Portal - Database Installer
 * Upload this file to your public_html, run it ONCE, then DELETE it.
 * Access it at: https://yourdomain.com/setup.php
 */

// ============================================================
//  CONFIGURATION — Edit these before running
// ============================================================
$DB_HOST = 'localhost';
$DB_USER = 'YOUR_CPANEL_DB_USER';     // e.g. myuser_gduportal
$DB_PASS = 'YOUR_CPANEL_DB_PASSWORD'; // Your cPanel DB user password
$DB_NAME = 'YOUR_CPANEL_DB_NAME';     // e.g. myuser_gdu_portal

// Default Super Admin credentials
$ADMIN_EMAIL    = 'admin@gdu.gov.ng';
$ADMIN_PASSWORD = 'GDU@123';
$ADMIN_NAME     = 'Super Administrator';

// ============================================================
//  SECURITY — Set a one-time install key to prevent abuse
//  Visit: /setup.php?key=GDU_INSTALL_2024
// ============================================================
$INSTALL_KEY = 'GDU_INSTALL_2024';

if (!isset($_GET['key']) || $_GET['key'] !== $INSTALL_KEY) {
    http_response_code(403);
    die('<h1>403 Forbidden</h1><p>Missing or invalid install key. Access: setup.php?key=GDU_INSTALL_2024</p>');
}

// ============================================================
//  HTML LAYOUT
// ============================================================
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GDU Portal Setup</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px; max-width: 780px; width: 100%; margin: 20px; }
  h1 { font-size: 24px; font-weight: 700; color: #38bdf8; margin-bottom: 8px; }
  h2 { font-size: 15px; color: #94a3b8; margin-bottom: 24px; font-weight: 400; }
  .step { border: 1px solid #334155; border-radius: 10px; padding: 16px 20px; margin-bottom: 12px; background: #0f172a; }
  .step.ok { border-color: #22c55e; }
  .step.error { border-color: #ef4444; }
  .step.info { border-color: #3b82f6; }
  .step-title { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .step-detail { font-size: 12px; color: #64748b; margin-top: 4px; font-family: monospace; }
  .ok .step-title { color: #22c55e; }
  .error .step-title { color: #ef4444; }
  .info .step-title { color: #38bdf8; }
  .badge { display: inline-block; background: #22c55e20; color: #22c55e; border: 1px solid #22c55e40; border-radius: 4px; font-size: 10px; padding: 2px 8px; }
  .badge-err { background: #ef444420; color: #ef4444; border-color: #ef444440; }
  .summary { background: #0f172a; border: 1px solid #22c55e; border-radius: 10px; padding: 20px; margin-top: 24px; }
  .summary h3 { color: #22c55e; font-size: 14px; margin-bottom: 12px; }
  .cred { background: #1e293b; border-radius: 8px; padding: 12px 16px; margin-top: 8px; font-family: monospace; font-size: 13px; }
  .cred span { color: #94a3b8; }
  .warning { background: #78350f20; border: 1px solid #f59e0b40; border-radius: 10px; padding: 16px; margin-top: 16px; color: #fbbf24; font-size: 13px; }
</style>
</head>
<body>
<div class="card">
  <h1>🚀 GDU Staff Portal — Database Setup</h1>
  <h2>One-time database installer for cPanel / Go45 / Go54</h2>

<?php

$errors = 0;
$warnings = 0;

function show_step($title, $detail, $status = 'ok') {
    echo "<div class=\"step $status\">";
    echo "<div class=\"step-title\">";
    if ($status === 'ok') echo "✓ ";
    else if ($status === 'error') echo "✗ ";
    else echo "ℹ ";
    echo htmlspecialchars($title);
    echo "</div>";
    if ($detail) echo "<div class=\"step-detail\">" . htmlspecialchars($detail) . "</div>";
    echo "</div>";
}

// ─── Step 1: Database Connection ─────────────────────────────
mysqli_report(MYSQLI_REPORT_OFF);
$conn = mysqli_connect($DB_HOST, $DB_USER, $DB_PASS);
if (!$conn) {
    $errors++;
    show_step("Database Connection Failed", "Error: " . mysqli_connect_error() . "\nCheck DB_HOST, DB_USER, DB_PASS at the top of this file.", 'error');
    goto done;
}
show_step("Database Connected", "Host: $DB_HOST | User: $DB_USER", 'ok');

// ─── Step 2: Create / Select Database ────────────────────────
mysqli_query($conn, "CREATE DATABASE IF NOT EXISTS `$DB_NAME` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
if (!mysqli_select_db($conn, $DB_NAME)) {
    $errors++;
    show_step("Cannot Select Database", "DB: $DB_NAME | Error: " . mysqli_error($conn), 'error');
    goto done;
}
show_step("Database Ready", "Using database: $DB_NAME", 'ok');
mysqli_set_charset($conn, 'utf8mb4');

// ─── Step 3: Create Tables ────────────────────────────────────
$tables = [];

$tables['profiles'] = "CREATE TABLE IF NOT EXISTS `profiles` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `full_name` VARCHAR(255),
  `role` ENUM('super_admin','admin','accounts','dg','technical_assistant','ict','staff','adhoc') NOT NULL DEFAULT 'staff',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(500),
  `phone` VARCHAR(20),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$tables['departments'] = "CREATE TABLE IF NOT EXISTS `departments` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT,
  `head_id` VARCHAR(36),
  `status` ENUM('active','inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['roles'] = "CREATE TABLE IF NOT EXISTS `roles` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `permissions` TEXT COMMENT 'JSON array',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['staff_records'] = "CREATE TABLE IF NOT EXISTS `staff_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `readable_id` VARCHAR(50) UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `gender` ENUM('male','female','other'),
  `date_of_birth` DATE,
  `address` TEXT,
  `state` VARCHAR(100),
  `lga` VARCHAR(100),
  `role` VARCHAR(100),
  `department_id` VARCHAR(36),
  `position` VARCHAR(255),
  `rank` VARCHAR(255),
  `grade_level` INT,
  `step` INT,
  `qualification` VARCHAR(255),
  `employment_date` DATE,
  `employment_type` VARCHAR(100),
  `status` ENUM('active','inactive','suspended') DEFAULT 'active',
  `passport_photo` VARCHAR(500),
  `passport_url` VARCHAR(500),
  `account_name` VARCHAR(255),
  `bank_name` VARCHAR(255),
  `account_number` VARCHAR(20),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['attendance'] = "CREATE TABLE IF NOT EXISTS `attendance` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `staff_id` VARCHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `check_in` TIME,
  `check_out` TIME,
  `status` ENUM('present','absent','late','leave','holiday') NOT NULL DEFAULT 'present',
  `method` ENUM('qr','manual','system') DEFAULT 'manual',
  `notes` TEXT,
  `recorded_by` VARCHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_staff_date` (`staff_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['allowances'] = "CREATE TABLE IF NOT EXISTS `allowances` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `staff_id` VARCHAR(36) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `month` INT,
  `year` INT,
  `status` ENUM('pending','approved','paid','rejected') DEFAULT 'pending',
  `attendance_percentage` DECIMAL(5,2) DEFAULT 0,
  `description` TEXT,
  `approved_by` VARCHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['monthly_allowance_settings'] = "CREATE TABLE IF NOT EXISTS `monthly_allowance_settings` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `month` INT NOT NULL,
  `year` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `attendance_threshold` INT DEFAULT 80,
  `eligible_roles` TEXT COMMENT 'JSON array',
  `eligible_departments` TEXT COMMENT 'JSON array',
  `set_by` VARCHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_month_year` (`month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['monthly_allowance_requests'] = "CREATE TABLE IF NOT EXISTS `monthly_allowance_requests` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `staff_id` VARCHAR(36) NOT NULL,
  `month` INT NOT NULL,
  `year` INT NOT NULL,
  `attendance_percentage` DECIMAL(5,2) DEFAULT 0,
  `allowance_amount` DECIMAL(12,2) DEFAULT 0.00,
  `status` ENUM('Processing','Approved','Paid','Rejected') DEFAULT 'Processing',
  `rejection_reason` TEXT,
  `reviewed_by` VARCHAR(36),
  `reviewed_at` DATETIME,
  `paid_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_staff_month_year` (`staff_id`, `month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['documents'] = "CREATE TABLE IF NOT EXISTS `documents` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `staff_id` VARCHAR(36),
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `file_url` VARCHAR(500),
  `file_name` VARCHAR(255),
  `file_size` INT,
  `file_type` VARCHAR(100),
  `category` VARCHAR(100),
  `is_public` TINYINT(1) DEFAULT 0,
  `uploaded_by` VARCHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['announcements'] = "CREATE TABLE IF NOT EXISTS `announcements` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `type` ENUM('info','warning','urgent','general') DEFAULT 'info',
  `target_roles` TEXT COMMENT 'JSON array, empty means all',
  `is_pinned` TINYINT(1) DEFAULT 0,
  `published_by` VARCHAR(36),
  `expires_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['messages'] = "CREATE TABLE IF NOT EXISTS `messages` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `sender_id` VARCHAR(36) NOT NULL,
  `receiver_id` VARCHAR(36),
  `channel_id` VARCHAR(36),
  `content` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['notifications'] = "CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `type` VARCHAR(100),
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT,
  `is_read` TINYINT(1) DEFAULT 0,
  `related_module` VARCHAR(100),
  `related_record_id` VARCHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['audit_logs'] = "CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36),
  `action` VARCHAR(255) NOT NULL,
  `table_name` VARCHAR(100),
  `record_id` VARCHAR(36),
  `old_data` TEXT,
  `new_data` TEXT,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['password_reset_tokens'] = "CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` VARCHAR(255) NOT NULL PRIMARY KEY,
  `token` VARCHAR(128) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['smtp_settings'] = "CREATE TABLE IF NOT EXISTS `smtp_settings` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `host` VARCHAR(255),
  `port` INT DEFAULT 587,
  `username` VARCHAR(255),
  `password` VARCHAR(255),
  `encryption` ENUM('SSL','TLS','None') DEFAULT 'TLS',
  `sender_email` VARCHAR(255),
  `sender_name` VARCHAR(255) DEFAULT 'GDU Staff Portal',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['branding_settings'] = "CREATE TABLE IF NOT EXISTS `branding_settings` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `organization_name` VARCHAR(255) DEFAULT 'Government Delivery Unit',
  `organization_short_name` VARCHAR(50) DEFAULT 'GDU',
  `logo_url` VARCHAR(500),
  `favicon_url` VARCHAR(500),
  `primary_color` VARCHAR(20) DEFAULT '#0A1F40',
  `secondary_color` VARCHAR(20) DEFAULT '#1E3A5F',
  `accent_color` VARCHAR(20) DEFAULT '#C8A951',
  `portal_title` VARCHAR(255) DEFAULT 'GDU Staff Management Portal',
  `footer_text` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$tables['payroll'] = "CREATE TABLE IF NOT EXISTS `payroll` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `staff_id` VARCHAR(36) NOT NULL,
  `month` INT NOT NULL,
  `year` INT NOT NULL,
  `basic_salary` DECIMAL(12,2) DEFAULT 0.00,
  `allowances_total` DECIMAL(12,2) DEFAULT 0.00,
  `deductions_total` DECIMAL(12,2) DEFAULT 0.00,
  `gross_pay` DECIMAL(12,2) DEFAULT 0.00,
  `net_pay` DECIMAL(12,2) DEFAULT 0.00,
  `status` ENUM('draft','processed','paid') DEFAULT 'draft',
  `generated_by` VARCHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_staff_payroll_month` (`staff_id`, `month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

foreach ($tables as $tableName => $sql) {
    if (mysqli_query($conn, $sql)) {
        show_step("Table `$tableName` created/verified", "", 'ok');
    } else {
        $errors++;
        show_step("Failed to create table `$tableName`", mysqli_error($conn), 'error');
    }
}

// ─── Step 4: Default Role Seeds ───────────────────────────────
$defaultRoles = [
    ['id' => '11111111-0000-0000-0000-000000000001', 'name' => 'Super Admin', 'slug' => 'super_admin'],
    ['id' => '11111111-0000-0000-0000-000000000002', 'name' => 'Administrator', 'slug' => 'admin'],
    ['id' => '11111111-0000-0000-0000-000000000003', 'name' => 'Accounts', 'slug' => 'accounts'],
    ['id' => '11111111-0000-0000-0000-000000000004', 'name' => 'Director General', 'slug' => 'dg'],
    ['id' => '11111111-0000-0000-0000-000000000005', 'name' => 'Technical Assistant', 'slug' => 'technical_assistant'],
    ['id' => '11111111-0000-0000-0000-000000000006', 'name' => 'ICT', 'slug' => 'ict'],
    ['id' => '11111111-0000-0000-0000-000000000007', 'name' => 'Staff', 'slug' => 'staff'],
    ['id' => '11111111-0000-0000-0000-000000000008', 'name' => 'Ad-hoc', 'slug' => 'adhoc'],
];
foreach ($defaultRoles as $role) {
    $stmt = mysqli_prepare($conn, "INSERT IGNORE INTO `roles` (id, name, slug) VALUES (?, ?, ?)");
    mysqli_stmt_bind_param($stmt, 'sss', $role['id'], $role['name'], $role['slug']);
    mysqli_stmt_execute($stmt);
}
show_step("Default roles seeded (8 roles)", "", 'ok');

// ─── Step 5: Default Departments ──────────────────────────────
$defaultDepts = [
    'Administration', 'Finance & Accounts', 'ICT', 'Human Resources',
    'Procurement', 'Legal', 'Planning & Research', 'Public Relations',
    'Internal Audit', 'Operations'
];
foreach ($defaultDepts as $dept) {
    $deptId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    $stmt = mysqli_prepare($conn, "INSERT IGNORE INTO `departments` (id, name) VALUES (?, ?)");
    mysqli_stmt_bind_param($stmt, 'ss', $deptId, $dept);
    mysqli_stmt_execute($stmt);
}
show_step("Default departments seeded (10 departments)", "", 'ok');

// ─── Step 6: Default Branding Settings ───────────────────────
mysqli_query($conn, "INSERT IGNORE INTO `branding_settings` (id, organization_name, organization_short_name, portal_title) VALUES (1, 'Government Delivery Unit', 'GDU', 'GDU Staff Management Portal')");
show_step("Default branding settings created", "", 'ok');

// ─── Step 7: Default SMTP Settings (empty placeholder) ────────
mysqli_query($conn, "INSERT IGNORE INTO `smtp_settings` (id, host, port, encryption, sender_name, sender_email) VALUES (1, '', 587, 'TLS', 'GDU Staff Portal', '')");
show_step("SMTP settings record initialized (configure from Admin > Settings)", "", 'info');

// ─── Step 8: Create Super Admin ──────────────────────────────
$adminId = '00000000-0000-0000-0000-000000000001';
$passwordHash = password_hash($ADMIN_PASSWORD, PASSWORD_DEFAULT);

$check = mysqli_query($conn, "SELECT id FROM profiles WHERE id = '$adminId' LIMIT 1");
if (mysqli_num_rows($check) === 0) {
    $stmt = mysqli_prepare($conn, "INSERT INTO `profiles` (id, email, full_name, role, is_active, password_hash) VALUES (?, ?, ?, 'super_admin', 1, ?)");
    mysqli_stmt_bind_param($stmt, 'ssss', $adminId, $ADMIN_EMAIL, $ADMIN_NAME, $passwordHash);
    if (mysqli_stmt_execute($stmt)) {
        // Create matching staff record
        $staffId = '00000000-0000-0000-0000-000000000002';
        $stmt2 = mysqli_prepare($conn, "INSERT IGNORE INTO `staff_records` (id, user_id, readable_id, full_name, email, role, status) VALUES (?, ?, 'GDU-0001', ?, ?, 'super_admin', 'active')");
        mysqli_stmt_bind_param($stmt2, 'ssss', $staffId, $adminId, $ADMIN_NAME, $ADMIN_EMAIL);
        mysqli_stmt_execute($stmt2);
        show_step("Super Admin account created", "Email: $ADMIN_EMAIL", 'ok');
    } else {
        show_step("Super Admin creation warning", mysqli_error($conn), 'info');
    }
} else {
    show_step("Super Admin already exists — skipped", "Email: $ADMIN_EMAIL", 'info');
}

done:

$allOk = $errors === 0;
?>

<?php if ($allOk): ?>
  <div class="summary">
    <h3>✅ Installation Complete!</h3>
    <p style="color:#94a3b8; font-size:13px; margin-bottom:12px;">Your database has been set up successfully. Use these credentials to log in:</p>
    <div class="cred"><span>Email:</span> <?php echo htmlspecialchars($ADMIN_EMAIL); ?></div>
    <div class="cred"><span>Password:</span> <?php echo htmlspecialchars($ADMIN_PASSWORD); ?></div>
  </div>
  <div class="warning">
    ⚠️ <strong>IMPORTANT:</strong> Delete this file (<code>setup.php</code>) from your server immediately after setup. Also update <code>api/config/database.php</code> with your actual cPanel database credentials before uploading the portal files.
  </div>
<?php else: ?>
  <div class="step error">
    <div class="step-title">✗ Installation encountered <?php echo $errors; ?> error(s). Fix the issues above and run again.</div>
  </div>
<?php endif; ?>

</div>
</body>
</html>
