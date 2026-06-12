<?php
/**
 * GDU Staff Management Portal - Custom SMTP / Mailer Helper
 * Supports secure SMTP via sockets for cPanel hosting.
 */

require_once __DIR__ . '/database.php';

function send_system_email($to, $subject, $body) {
    $conn = get_db_connection();
    
    // Get SMTP settings
    $smtp_query = "SELECT * FROM smtp_settings WHERE id = 1 LIMIT 1";
    $result = mysqli_query($conn, $smtp_query);
    $settings = mysqli_fetch_assoc($result);
    
    if (!$settings || empty($settings['host']) || empty($settings['username'])) {
        // Fallback to native PHP mail() if settings are not set
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: GDU Portal <noreply@gdu.gov.ng>\r\n";
        return mail($to, $subject, $body, $headers);
    }
    
    $host = $settings['host'];
    $port = intval($settings['port']);
    $username = $settings['username'];
    $password = $settings['password'];
    $from_email = $settings['sender_email'];
    $from_name = $settings['sender_name'] ?: 'GDU Staff Portal';
    $encryption = strtoupper($settings['encryption']); // SSL, TLS, None
    
    return socket_smtp_send($host, $port, $username, $password, $from_email, $from_name, $to, $subject, $body, $encryption);
}

function socket_smtp_send($host, $port, $username, $password, $from, $from_name, $to, $subject, $body, $encryption) {
    $timeout = 15;
    $socket_host = $host;
    
    if ($encryption === 'SSL') {
        $socket_host = 'ssl://' . $host;
    }
    
    $socket = @stream_socket_client("$socket_host:$port", $errno, $errstr, $timeout);
    if (!$socket) {
        error_log("SMTP Connection failed: $errstr ($errno)");
        return false;
    }
    
    $response = fgets($socket, 515);
    
    // Send EHLO
    fwrite($socket, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
    $response = smtp_read_response($socket);
    
    if ($encryption === 'TLS') {
        fwrite($socket, "STARTTLS\r\n");
        $response = fgets($socket, 515);
        if (strpos($response, '220') === 0) {
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                error_log("SMTP: Failed to enable TLS encryption.");
                fclose($socket);
                return false;
            }
            // Re-send EHLO after starting TLS
            fwrite($socket, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
            $response = smtp_read_response($socket);
        }
    }
    
    // Auth Login
    fwrite($socket, "AUTH LOGIN\r\n");
    $response = fgets($socket, 515);
    
    fwrite($socket, base64_encode($username) . "\r\n");
    $response = fgets($socket, 515);
    
    fwrite($socket, base64_encode($password) . "\r\n");
    $response = fgets($socket, 515);
    
    if (strpos($response, '235') !== 0) {
        error_log("SMTP Auth failed: $response");
        fclose($socket);
        return false;
    }
    
    // Mail From
    fwrite($socket, "MAIL FROM:<$from>\r\n");
    $response = fgets($socket, 515);
    
    // Rcpt To
    fwrite($socket, "RCPT TO:<$to>\r\n");
    $response = fgets($socket, 515);
    
    // Data
    fwrite($socket, "DATA\r\n");
    $response = fgets($socket, 515);
    
    // Message headers & body
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: =?UTF-8?B?" . base64_encode($from_name) . "?= <$from>\r\n";
    $headers .= "To: <$to>\r\n";
    $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
    $headers .= "Date: " . date('r') . "\r\n";
    $headers .= "\r\n";
    
    fwrite($socket, $headers . $body . "\r\n.\r\n");
    $response = fgets($socket, 515);
    
    // Quit
    fwrite($socket, "QUIT\r\n");
    fclose($socket);
    
    return strpos($response, '250') === 0;
}

function smtp_read_response($socket) {
    $response = "";
    while ($line = fgets($socket, 515)) {
        $response .= $line;
        if (substr($line, 3, 1) == " ") {
            break;
        }
    }
    return $response;
}
