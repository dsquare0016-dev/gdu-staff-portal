<?php
/**
 * GDU Staff Management Portal - Generic Database Operations API
 * Maps client-side Supabase query chains to safe MySQLi queries.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: authorization, content-type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config/database.php';

// Helper: JWT-like verification function
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
    
    // Simple Base64 token verify
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

$conn = get_db_connection();
$user = get_authenticated_user();

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['table'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => ['message' => 'Invalid request parameters']]);
    exit;
}

$table = preg_replace('/[^a-zA-Z0-9_]/', '', $input['table']);
$method = isset($input['method']) ? $input['method'] : 'select';
$selectCols = isset($input['selectCols']) ? $input['selectCols'] : '*';
$insertData = isset($input['insertData']) ? $input['insertData'] : null;
$updateData = isset($input['updateData']) ? $input['updateData'] : null;
$filters = isset($input['filters']) ? $input['filters'] : [];
$orders = isset($input['orders']) ? $input['orders'] : [];
$limitCount = isset($input['limitCount']) ? (int)$input['limitCount'] : null;
$isSingle = isset($input['isSingle']) ? (bool)$input['isSingle'] : false;
$isMaybeSingle = isset($input['isMaybeSingle']) ? (bool)$input['isMaybeSingle'] : false;

// Parse nested queries (relationship joins)
$nestedQueries = [];
if ($method === 'select' && $selectCols !== '*') {
    preg_match_all('/([a-zA-Z0-9_]+)(?::([a-zA-Z0-9_]+))?(?:!([a-zA-Z0-9_]+))?\(([^)]+)\)/', $selectCols, $matches, PREG_SET_ORDER);
    foreach ($matches as $m) {
        $alias = $m[1];
        $subTable = isset($m[2]) && !empty($m[2]) ? $m[2] : $m[1];
        $fk = isset($m[3]) && !empty($m[3]) ? $m[3] : null;
        
        // Handle special case staff_records:staff_id
        if (substr($subTable, -3) === '_id') {
            $fk = $subTable;
            $subTable = $alias;
        }
        
        if (!$fk) {
            if ($subTable === 'staff_records') $fk = 'staff_id';
            else if ($subTable === 'departments') $fk = 'department_id';
            else $fk = $subTable . '_id';
        }
        
        $cols = $m[4];
        
        $nestedQueries[] = [
            'raw' => $m[0],
            'alias' => $alias,
            'table' => $subTable,
            'fk' => $fk,
            'cols' => $cols
        ];
        
        // Strip out the sub-query from the main selectCols
        $selectCols = str_replace($m[0], '', $selectCols);
    }
    
    // Clean up commas
    $selectCols = trim(preg_replace('/,\s*,/', ',', $selectCols), ' ,');
    if (empty($selectCols)) {
        $selectCols = '*';
    }
}

// Build WHERE clause
$whereClauses = [];
$params = [];
$types = '';

foreach ($filters as $f) {
    $col = preg_replace('/[^a-zA-Z0-9_]/', '', $f['column']);
    $val = $f['value'];
    $type = $f['type'];
    
    if ($type === 'eq') {
        if ($val === null) {
            $whereClauses[] = "`$col` IS NULL";
        } else {
            $whereClauses[] = "`$col` = ?";
            $params[] = $val;
            $types .= is_numeric($val) ? 'i' : 's';
        }
    } else if ($type === 'neq') {
        if ($val === null) {
            $whereClauses[] = "`$col` IS NOT NULL";
        } else {
            $whereClauses[] = "`$col` != ?";
            $params[] = $val;
            $types .= is_numeric($val) ? 'i' : 's';
        }
    } else if ($type === 'gte') {
        $whereClauses[] = "`$col` >= ?";
        $params[] = $val;
        $types .= is_numeric($val) ? 'i' : 's';
    } else if ($type === 'lte') {
        $whereClauses[] = "`$col` <= ?";
        $params[] = $val;
        $types .= is_numeric($val) ? 'i' : 's';
    } else if ($type === 'gt') {
        $whereClauses[] = "`$col` > ?";
        $params[] = $val;
        $types .= is_numeric($val) ? 'i' : 's';
    } else if ($type === 'lt') {
        $whereClauses[] = "`$col` < ?";
        $params[] = $val;
        $types .= is_numeric($val) ? 'i' : 's';
    } else if ($type === 'in') {
        if (is_array($val) && !empty($val)) {
            $placeholders = implode(',', array_fill(0, count($val), '?'));
            $whereClauses[] = "`$col` IN ($placeholders)";
            foreach ($val as $v) {
                $params[] = $v;
                $types .= is_numeric($v) ? 'i' : 's';
            }
        }
    } else if ($type === 'like' || $type === 'ilike') {
        $whereClauses[] = "`$col` LIKE ?";
        $params[] = $val;
        $types .= 's';
    } else if ($type === 'is') {
        if ($val === null) {
            $whereClauses[] = "`$col` IS NULL";
        } else {
            $whereClauses[] = "`$col` = ?";
            $params[] = $val;
            $types .= is_numeric($val) ? 'i' : 's';
        }
    }
}

$whereSQL = '';
if (!empty($whereClauses)) {
    $whereSQL = ' WHERE ' . implode(' AND ', $whereClauses);
}

// EXECUTE METHODS
if ($method === 'select') {
    // Check if selecting specific columns or just escaping
    $colsSQL = '*';
    if ($selectCols !== '*') {
        $colsArr = explode(',', $selectCols);
        $cleanCols = [];
        foreach ($colsArr as $c) {
            $c = trim($c);
            if (!empty($c)) {
                $cleanCols[] = '`' . preg_replace('/[^a-zA-Z0-9_]/', '', $c) . '`';
            }
        }
        if (!empty($cleanCols)) {
            $colsSQL = implode(', ', $cleanCols);
        }
    }
    
    $orderSQL = '';
    if (!empty($orders)) {
        $orderClauses = [];
        foreach ($orders as $o) {
            $col = preg_replace('/[^a-zA-Z0-9_]/', '', $o['column']);
            $dir = $o['ascending'] ? 'ASC' : 'DESC';
            $orderClauses[] = "`$col` $dir";
        }
        $orderSQL = ' ORDER BY ' . implode(', ', $orderClauses);
    }
    
    $limitSQL = '';
    if ($limitCount !== null) {
        $limitSQL = " LIMIT $limitCount";
    }
    
    $query = "SELECT $colsSQL FROM `$table`" . $whereSQL . $orderSQL . $limitSQL;
    
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => ['message' => mysqli_error($conn)]]);
        exit;
    }
    
    if (!empty($params)) {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }
    
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $data = [];
    while ($row = mysqli_fetch_assoc($result)) {
        // Resolve nested queries if any
        foreach ($nestedQueries as $nq) {
            $nqTable = $nq['table'];
            $nqFk = $nq['fk'];
            $nqAlias = $nq['alias'];
            $nqCols = $nq['cols'];
            
            // Check if foreign key is local or foreign
            // In case of staff_records:staff_id, the local row has `staff_id`, which maps to `id` in `staff_records`
            // In case of profiles, the local row has `user_id` or similar
            $fkVal = null;
            $localFk = $nqFk;
            
            // Determine local foreign key name
            if (isset($row[$nqFk])) {
                $fkVal = $row[$nqFk];
            } else if (isset($row['id'])) {
                // If local row is staff_records and relation is departments, local department_id is used.
                // But if local table is staff_records and relation is profiles (which has user_id), we check local user_id:
                if ($nqTable === 'profiles' && isset($row['user_id'])) {
                    $fkVal = $row['user_id'];
                } else if ($nqTable === 'departments' && isset($row['department_id'])) {
                    $fkVal = $row['department_id'];
                } else if ($nqTable === 'roles' && isset($row['role_id'])) {
                    $fkVal = $row['role_id'];
                }
            }
            
            if ($fkVal) {
                // Perform sub-query
                $subColsSQL = '*';
                if ($nqCols !== '*') {
                    $subColsArr = explode(',', $nqCols);
                    $subCleanCols = [];
                    foreach ($subColsArr as $sc) {
                        $sc = trim($sc);
                        if (!empty($sc)) {
                            $subCleanCols[] = '`' . preg_replace('/[^a-zA-Z0-9_]/', '', $sc) . '`';
                        }
                    }
                    if (!empty($subCleanCols)) {
                        $subColsSQL = implode(', ', $subCleanCols);
                    }
                }
                
                // Query target key: usually `id` unless table is profiles and local is user_id (which is mapped to id)
                $targetKey = 'id';
                
                $subQuery = "SELECT $subColsSQL FROM `$nqTable` WHERE `$targetKey` = ? LIMIT 1";
                $subStmt = mysqli_prepare($conn, $subQuery);
                if ($subStmt) {
                    mysqli_stmt_bind_param($subStmt, 's', $fkVal);
                    mysqli_stmt_execute($subStmt);
                    $subRes = mysqli_stmt_get_result($subStmt);
                    $subRow = mysqli_fetch_assoc($subRes);
                    
                    // If subTable has further joins (like staff_records -> departments)
                    if ($subRow && $nqTable === 'staff_records' && isset($subRow['department_id'])) {
                        $deptQuery = "SELECT name FROM departments WHERE id = ? LIMIT 1";
                        $deptStmt = mysqli_prepare($conn, $deptQuery);
                        if ($deptStmt) {
                            mysqli_stmt_bind_param($deptStmt, 's', $subRow['department_id']);
                            mysqli_stmt_execute($deptStmt);
                            $deptRes = mysqli_stmt_get_result($deptStmt);
                            $deptRow = mysqli_fetch_assoc($deptRes);
                            $subRow['department'] = $deptRow ? $deptRow : null;
                        }
                    }
                    
                    $row[$nqAlias] = $subRow ? $subRow : null;
                }
            } else {
                $row[$nqAlias] = null;
            }
        }
        
        // Normalize boolean values
        $boolFields = ['is_active', 'verified', 'approved', 'is_pinned', 'is_read'];
        // JSON array fields stored as TEXT/JSON in MySQL
        $jsonArrayFields = ['eligible_roles', 'eligible_departments', 'permissions', 'metadata', 'tags'];
        foreach ($row as $key => $value) {
            if (in_array($key, $boolFields)) {
                $row[$key] = ($value === '1' || $value === 1 || $value === true);
            } else if (in_array($key, $jsonArrayFields) && is_string($value)) {
                $decoded = json_decode($value, true);
                $row[$key] = is_array($decoded) ? $decoded : (empty($value) ? [] : $value);
            }
        }
        
        $data[] = $row;
    }
    
    if ($isSingle || $isMaybeSingle) {
        echo json_encode([
            'success' => true,
            'data' => !empty($data) ? $data[0] : null
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'data' => $data
        ]);
    }
    
} else if ($method === 'insert') {
    if (!is_array($insertData) || empty($insertData)) {
        echo json_encode(['success' => false, 'error' => ['message' => 'No insert data provided']]);
        exit;
    }
    
    $insertedRows = [];
    foreach ($insertData as $row) {
        // Generate UUID if not provided
        if (!isset($row['id']) || empty($row['id'])) {
            $row['id'] = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                mt_rand(0, 0xffff),
                mt_rand(0, 0x0fff) | 0x4000,
                mt_rand(0, 0x3fff) | 0x8000,
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
            );
        }
        
        $cols = [];
        $vals = [];
        $placeholders = [];
        $iTypes = '';
        $iParams = [];
        
        $jsonArrayFields = ['eligible_roles', 'eligible_departments', 'permissions', 'metadata', 'tags'];
        foreach ($row as $k => $v) {
            $cols[] = '`' . preg_replace('/[^a-zA-Z0-9_]/', '', $k) . '`';
            // Convert boolean to integer
            if (is_bool($v)) {
                $v = $v ? 1 : 0;
            } else if (is_array($v) || (in_array($k, $jsonArrayFields) && !is_null($v))) {
                // Store arrays as JSON strings
                $v = is_array($v) ? json_encode($v) : $v;
            }
            $iParams[] = $v;
            $placeholders[] = '?';
            $iTypes .= is_numeric($v) && !is_string($v) ? 'i' : 's';
        }
        
        $query = "INSERT INTO `$table` (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = mysqli_prepare($conn, $query);
        if (!$stmt) {
            echo json_encode(['success' => false, 'error' => ['message' => mysqli_error($conn)]]);
            exit;
        }
        
        mysqli_stmt_bind_param($stmt, $iTypes, ...$iParams);
        if (!mysqli_stmt_execute($stmt)) {
            echo json_encode(['success' => false, 'error' => ['message' => mysqli_stmt_error($stmt)]]);
            exit;
        }
        
        $insertedRows[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $insertedRows
    ]);
    
} else if ($method === 'update') {
    if (!$updateData) {
        echo json_encode(['success' => false, 'error' => ['message' => 'No update data provided']]);
        exit;
    }
    
    $setClauses = [];
    $uParams = [];
    $uTypes = '';
    
    $jsonArrayFields = ['eligible_roles', 'eligible_departments', 'permissions', 'metadata', 'tags'];
    foreach ($updateData as $k => $v) {
        $col = preg_replace('/[^a-zA-Z0-9_]/', '', $k);
        $setClauses[] = "`$col` = ?";
        if (is_bool($v)) {
            $v = $v ? 1 : 0;
        } else if (is_array($v) || (in_array($k, $jsonArrayFields) && !is_null($v))) {
            $v = is_array($v) ? json_encode($v) : $v;
        }
        $uParams[] = $v;
        $uTypes .= is_numeric($v) && !is_string($v) ? 'i' : 's';
    }
    
    // Append WHERE filters
    $uParams = array_merge($uParams, $params);
    $uTypes .= $types;
    
    $query = "UPDATE `$table` SET " . implode(', ', $setClauses) . $whereSQL;
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => ['message' => mysqli_error($conn)]]);
        exit;
    }
    
    if (!empty($uParams)) {
        mysqli_stmt_bind_param($stmt, $uTypes, ...$uParams);
    }
    
    if (mysqli_stmt_execute($stmt)) {
        echo json_encode([
            'success' => true,
            'data' => $updateData
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => ['message' => mysqli_stmt_error($stmt)]
        ]);
    }
    
} else if ($method === 'delete') {
    $query = "DELETE FROM `$table`" . $whereSQL;
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => ['message' => mysqli_error($conn)]]);
        exit;
    }
    
    if (!empty($params)) {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }
    
    if (mysqli_stmt_execute($stmt)) {
        echo json_encode([
            'success' => true,
            'data' => []
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => ['message' => mysqli_stmt_error($stmt)]
        ]);
    }
}
