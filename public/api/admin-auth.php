<?php
/**
 * GDU Staff Management Portal - Admin Auth API
 * Replaces Deno Supabase Edge Function.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: authorization, content-type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/mailer.php';

$conn = get_db_connection();

function get_authenticated_user() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    if (empty($authHeader) && isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
    }
    
    if (empty($authHeader)) {
        return null;
    }
    
    $token = str_replace('Bearer ', '', $authHeader);
    
    $parts = explode('.', $token);
    if (count($parts) !== 2) return null;
    
    $payload = base64_decode($parts[0]);
    $signature = $parts[1];
    
    if (hash_hmac('sha256', $payload, 'GDU_SECRET_KEY') !== $signature) {
        return null;
    }
    
    $data = json_decode($payload, true);
    if (isset($data['exp']) && $data['exp'] < time()) {
        return null;
    }
    return $data;
}

$caller = get_authenticated_user();

if (!$caller) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access', 'code' => 'unauthorized']);
    exit;
}

// Verify caller is authorized (super_admin, admin, ict, dg, technical_assistant)
$authorizedRoles = ['super_admin', 'ict', 'admin', 'dg', 'technical_assistant'];
if (!in_array($caller['role'], $authorizedRoles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => "Forbidden: Role '{$caller['role']}' is not authorized", 'code' => 'forbidden']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input', 'code' => 'invalid_input']);
    exit;
}

$action = isset($input['action']) ? $input['action'] : '';

if ($action === 'create-user' || $action === 'register-staff') {
    $email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
    $password = isset($input['password']) && !empty($input['password']) ? $input['password'] : 'GDU@123';
    $fullName = isset($input['fullName']) ? trim($input['fullName']) : '';
    $role = isset($input['role']) ? trim($input['role']) : 'staff';
    
    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email is required', 'code' => 'email_required']);
        exit;
    }
    
    // Check if user already exists in profiles
    $check_stmt = mysqli_prepare($conn, "SELECT id FROM profiles WHERE email = ? LIMIT 1");
    mysqli_stmt_bind_param($check_stmt, 's', $email);
    mysqli_stmt_execute($check_stmt);
    $res = mysqli_stmt_get_result($check_stmt);
    if (mysqli_fetch_assoc($res)) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'User email already exists. Use edit staff instead.', 'code' => 'user_already_exists']);
        exit;
    }
    
    // Create new profile id (UUID style)
    $newUserId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert profile
    $profile_stmt = mysqli_prepare($conn, "INSERT INTO profiles (id, email, full_name, role, is_active, password_hash) VALUES (?, ?, ?, ?, 1, ?)");
    mysqli_stmt_bind_param($profile_stmt, 'sssss', $newUserId, $email, $fullName, $role, $passwordHash);
    
    if (!mysqli_stmt_execute($profile_stmt)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create database profile: ' . mysqli_error($conn), 'code' => 'profile_creation_failed']);
        exit;
    }
    
    // Staff Registration Email notification
    $loginUrl = "http://" . $_SERVER['HTTP_HOST'] . "/";
    $subject = "Welcome to GDU Staff Portal - Account Details";
    $body = "
    <div style='font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #ddd;'>
        <h2 style='color: #0A1F40;'>GDU Staff Portal</h2>
        <p>Hello " . htmlspecialchars($fullName) . ",</p>
        <p>An account has been created for you on the GDU Staff Management Portal.</p>
        <p>Here are your login details:</p>
        <table style='margin: 20px 0; border-collapse: collapse; width: 100%;'>
            <tr>
                <td style='padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;'>Login Email:</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee;'>" . htmlspecialchars($email) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;'>Assigned Role:</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee;'>" . htmlspecialchars(str_replace('_', ' ', ucwords($role))) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;'>Password:</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee;'><code>" . htmlspecialchars($password) . "</code></td>
            </tr>
        </table>
        <p style='text-align: center; margin: 30px 0;'>
            <a href='" . $loginUrl . "' style='background-color: #0A1F40; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Login to Portal</a>
        </p>
        <p>Please log in and change your password immediately in your account settings.</p>
        <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
        <p style='font-size: 11px; color: #888;'>This is a system generated email. Please do not reply.</p>
    </div>";
    
    send_system_email($email, $subject, $body);
    
    echo json_encode([
        'success' => true,
        'message' => 'Staff account created successfully',
        'user' => [
            'id' => $newUserId,
            'email' => $email,
            'role' => $role
        ]
    ]);
    
} else if ($action === 'delete-user') {
    $userId = isset($input['userId']) ? trim($input['userId']) : '';
    
    if (empty($userId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'User ID is required for deletion', 'code' => 'missing_userid']);
        exit;
    }
    
    // Check if user exists
    $check_stmt = mysqli_prepare($conn, "SELECT email FROM profiles WHERE id = ? LIMIT 1");
    mysqli_stmt_bind_param($check_stmt, 's', $userId);
    mysqli_stmt_execute($check_stmt);
    $res = mysqli_stmt_get_result($check_stmt);
    $userRow = mysqli_fetch_assoc($res);
    
    if (!$userRow) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found', 'code' => 'user_not_found']);
        exit;
    }
    
    // Delete in correct order to maintain constraints
    mysqli_query($conn, "DELETE FROM messages WHERE sender_id IN (SELECT id FROM staff_records WHERE user_id = '$userId') OR receiver_id IN (SELECT id FROM staff_records WHERE user_id = '$userId')");
    mysqli_query($conn, "DELETE FROM attendance WHERE staff_id IN (SELECT id FROM staff_records WHERE user_id = '$userId')");
    mysqli_query($conn, "DELETE FROM allowances WHERE staff_id IN (SELECT id FROM staff_records WHERE user_id = '$userId')");
    mysqli_query($conn, "DELETE FROM monthly_allowance_requests WHERE staff_id IN (SELECT id FROM staff_records WHERE user_id = '$userId')");
    mysqli_query($conn, "DELETE FROM staff_records WHERE user_id = '$userId'");
    mysqli_query($conn, "DELETE FROM profiles WHERE id = '$userId'");
    
    echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    
} else if ($action === 'reset-password') {
    $userId = isset($input['userId']) ? trim($input['userId']) : '';
    $password = isset($input['password']) ? $input['password'] : '';
    
    if (empty($userId) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'User ID and password are required', 'code' => 'missing_params']);
        exit;
    }
    
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = mysqli_prepare($conn, "UPDATE profiles SET password_hash = ? WHERE id = ?");
    mysqli_stmt_bind_param($stmt, 'ss', $passwordHash, $userId);
    
    if (mysqli_stmt_execute($stmt)) {
        echo json_encode(['success' => true, 'message' => 'Password reset successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to reset password: ' . mysqli_error($conn), 'code' => 'reset_failed']);
    }
} else if ($action === 'send-recovery') {
    $email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email is required', 'code' => 'missing_email']);
        exit;
    }
    
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + 3600);
    
    mysqli_query($conn, "REPLACE INTO password_reset_tokens (email, token, expires_at) VALUES ('" . mysqli_real_escape_string($conn, $email) . "', '$token', '$expires')");
    
    $resetLink = "http://" . $_SERVER['HTTP_HOST'] . "/update-password?token=" . $token;
    
    $subject = "Password Recovery Link - GDU Portal";
    $body = "
    <div style='font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #ddd;'>
        <h2 style='color: #0A1F40;'>GDU Staff Portal</h2>
        <p>An administrator generated a password recovery link for your account.</p>
        <p>Please click below to reset your password:</p>
        <p style='text-align: center; margin: 30px 0;'>
            <a href='" . $resetLink . "' style='background-color: #0A1F40; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Reset Password</a>
        </p>
        <p>Or copy this link into your browser:</p>
        <p><a href='" . $resetLink . "'>" . $resetLink . "</a></p>
        <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
        <p style='font-size: 11px; color: #888;'>This is a system generated email.</p>
    </div>";
    
    $sent = send_system_email($email, $subject, $body);
    echo json_encode(['success' => $sent]);
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action', 'code' => 'invalid_action']);
}
