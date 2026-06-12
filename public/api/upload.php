<?php
/**
 * GDU Staff Management Portal - File Upload API
 * Replaces Supabase Storage upload.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: authorization, content-type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config/database.php';

// Check auth token (optional but recommended)
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (empty($authHeader) && isset($headers['authorization'])) {
    $authHeader = $headers['authorization'];
}

if (empty($authHeader)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];
$bucket = isset($_POST['bucket']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['bucket']) : 'uploads';
$pathStr = isset($_POST['path']) ? $_POST['path'] : '';

// Resolve directory path
$baseUploadDir = __DIR__ . '/../uploads';
$targetDir = $baseUploadDir . '/' . $bucket;

if (!empty($pathStr)) {
    // If pathStr is like "branding/logo.png" or similar, we can extract subfolders
    $parts = explode('/', $pathStr);
    if (count($parts) > 1) {
        array_pop($parts); // Remove filename
        $targetDir .= '/' . implode('/', $parts);
    }
}

// Clean target directory path
$targetDir = str_replace(['..', '\\'], ['', '/'], $targetDir);

if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

// Generate unique filename or use pathStr filename
$fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$filename = uniqid('file_', true) . '.' . $fileExt;

if (!empty($pathStr)) {
    $filename = basename($pathStr);
}

$targetFile = $targetDir . '/' . $filename;

// Security check: restrict upload file types
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
if (!in_array($fileExt, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'File type not allowed']);
    exit;
}

if (move_uploaded_file($file['tmp_name'], $targetFile)) {
    // Return relative URL for frontend consumption
    // Relative path from public_html root: /uploads/{bucket}/{pathStr}
    $relativeUrl = '/uploads/' . $bucket . '/' . (empty($pathStr) ? $filename : $pathStr);
    // Replace duplicate slashes
    $relativeUrl = preg_replace('#/+#', '/', $relativeUrl);
    
    echo json_encode([
        'success' => true,
        'message' => 'File uploaded successfully',
        'data' => [
            'path' => $pathStr,
            'url' => $relativeUrl
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to move uploaded file']);
}
