<?php
/**
 * GDU Staff Management Portal - Database Connection
 * Easily customizable for cPanel / Go45 / Go54 hosting.
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'gdu_portal');

function get_db_connection() {
    static $conn = null;
    if ($conn === null) {
        // Suppress warnings to handle them via standard JSON responses
        mysqli_report(MYSQLI_REPORT_OFF);
        
        $conn = mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if (!$conn) {
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed: ' . mysqli_connect_error()
            ]);
            exit;
        }
        
        mysqli_set_charset($conn, 'utf8mb4');
    }
    return $conn;
}
