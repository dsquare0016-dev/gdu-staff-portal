<?php
/**
 * GDU Staff Management Portal - Authentication API
 * Handles login, token generation/verification, and password resets.
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

function generate_token($user_id, $email, $role) {
    $payload = json_encode([
        'user_id' => $user_id,
        'email' => $email,
        'role' => $role,
        'exp' => time() + (86400 * 30) // 30 days
    ]);
    return base64_encode($payload) . '.' . hash_hmac('sha256', $payload, 'GDU_SECRET_KEY');
}

function verify_token($token) {
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

$input = json_decode(file_get_contents('php://input'), true);
$action = isset($input['action']) ? $input['action'] : '';

if ($action === 'login') {
    $emailOrId = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? $input['password'] : '';
    
    if (empty($emailOrId) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Please provide email/Staff ID and password.']);
        exit;
    }
    
    $email = strtolower($emailOrId);
    
    // Support login via Staff ID
    if (strpos($email, '@') === false) {
        $staff_stmt = mysqli_prepare($conn, "SELECT email FROM staff_records WHERE UPPER(readable_id) = ? LIMIT 1");
        $upperId = strtoupper($emailOrId);
        mysqli_stmt_bind_param($staff_stmt, 's', $upperId);
        mysqli_stmt_execute($staff_stmt);
        $res = mysqli_stmt_get_result($staff_stmt);
        $staff = mysqli_fetch_assoc($res);
        if ($staff) {
            $email = strtolower($staff['email']);
        }
    }
    
    // Retrieve profile
    $stmt = mysqli_prepare($conn, "SELECT * FROM profiles WHERE LOWER(email) = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, 's', $email);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $profile = mysqli_fetch_assoc($res);
    
    if (!$profile) {
        echo json_encode(['success' => false, 'message' => 'Invalid email/Staff ID or password.']);
        exit;
    }
    
    if (!$profile['is_active']) {
        echo json_encode(['success' => false, 'message' => 'This account is inactive. Please contact your supervisor.']);
        exit;
    }
    
    // Verify password
    if (!password_verify($password, $profile['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid email/Staff ID or password.']);
        exit;
    }
    
    $token = generate_token($profile['id'], $profile['email'], $profile['role']);
    
    $session = [
        'access_token' => $token,
        'token_type' => 'bearer',
        'expires_in' => 86400 * 30,
        'user' => [
            'id' => $profile['id'],
            'email' => $profile['email'],
            'role' => $profile['role'],
            'user_metadata' => [
                'full_name' => $profile['full_name'],
                'role' => $profile['role']
            ]
        ]
    ];
    
    echo json_encode([
        'success' => true,
        'data' => [
            'session' => $session
        ]
    ]);
    
} else if ($action === 'forgot-password') {
    $email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
    if (empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Email is required.']);
        exit;
    }
    
    $stmt = mysqli_prepare($conn, "SELECT id, full_name FROM profiles WHERE email = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, 's', $email);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($res);
    
    if (!$user) {
        // Silent success or custom message. Let's return success for security.
        echo json_encode(['success' => true, 'message' => 'If the email exists, a reset link has been sent.']);
        exit;
    }
    
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + 3600); // 1 hour
    
    $token_stmt = mysqli_prepare($conn, "REPLACE INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)");
    mysqli_stmt_bind_param($token_stmt, 'sss', $email, $token, $expires);
    mysqli_stmt_execute($token_stmt);
    
    $resetLink = "http://" . $_SERVER['HTTP_HOST'] . "/update-password?token=" . $token;
    
    $subject = "Password Reset Request - GDU Portal";
    $body = "
    <div style='font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #ddd;'>
        <h2 style='color: #0A1F40;'>GDU Staff Portal</h2>
        <p>Hello " . htmlspecialchars($user['full_name']) . ",</p>
        <p>You requested a password reset for your account on the GDU Staff Management Portal.</p>
        <p>Please click the button below to reset your password. This link will expire in 1 hour.</p>
        <p style='text-align: center; margin: 30px 0;'>
            <a href='" . $resetLink . "' style='background-color: #0A1F40; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Reset Password</a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p><a href='" . $resetLink . "'>" . $resetLink . "</a></p>
        <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
        <p style='font-size: 11px; color: #888;'>If you did not request this, please ignore this email.</p>
    </div>";
    
    $sent = send_system_email($email, $subject, $body);
    
    echo json_encode([
        'success' => $sent,
        'message' => $sent ? 'If the email exists, a reset link has been sent.' : 'Failed to send reset email.'
    ]);
    
} else if ($action === 'update-password') {
    // Requires authorization header
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    if (empty($authHeader) && isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
    }
    
    $password = isset($input['password']) ? $input['password'] : '';
    if (empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Password is required.']);
        exit;
    }
    
    $userId = null;
    $email = null;
    
    // Check if updating via direct session token or via a password reset token query
    $resetToken = isset($input['token']) ? trim($input['token']) : '';
    
    if (!empty($resetToken)) {
        // Resolve email from reset token
        $token_stmt = mysqli_prepare($conn, "SELECT email FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() LIMIT 1");
        mysqli_stmt_bind_param($token_stmt, 's', $resetToken);
        mysqli_stmt_execute($token_stmt);
        $res = mysqli_stmt_get_result($token_stmt);
        $tokenRow = mysqli_fetch_assoc($res);
        
        if ($tokenRow) {
            $email = $tokenRow['email'];
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid or expired reset token.']);
            exit;
        }
    } else {
        // Standard session update
        if (empty($authHeader)) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }
        $token = str_replace('Bearer ', '', $authHeader);
        $data = verify_token($token);
        if (!$data) {
            echo json_encode(['success' => false, 'message' => 'Invalid session']);
            exit;
        }
        $userId = $data['user_id'];
    }
    
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    
    if ($userId) {
        $update_stmt = mysqli_prepare($conn, "UPDATE profiles SET password_hash = ? WHERE id = ?");
        mysqli_stmt_bind_param($update_stmt, 'ss', $password_hash, $userId);
    } else {
        $update_stmt = mysqli_prepare($conn, "UPDATE profiles SET password_hash = ? WHERE email = ?");
        mysqli_stmt_bind_param($update_stmt, 'ss', $password_hash, $email);
        
        // Remove token
        mysqli_query($conn, "DELETE FROM password_reset_tokens WHERE email = '" . mysqli_real_escape_string($conn, $email) . "'");
    }
    
    if (mysqli_stmt_execute($update_stmt)) {
        // Fetch updated user details if updated by ID
        $user_meta = null;
        if ($userId) {
            $user_stmt = mysqli_query($conn, "SELECT id, email, role, full_name FROM profiles WHERE id = '$userId'");
            $user_meta = mysqli_fetch_assoc($user_stmt);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Password reset/updated successfully',
            'data' => ['user' => $user_meta]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update password.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Unknown action.']);
}
