<?php
declare(strict_types=1);
session_start();

$baseDir = __DIR__;
$db = new PDO('sqlite:' . $baseDir . DIRECTORY_SEPARATOR . 'loan_emi_calculator.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
$db->exec('CREATE TABLE IF NOT EXISTS calculations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, loan_name TEXT NOT NULL, principal REAL NOT NULL, annual_rate REAL NOT NULL, tenure_months INTEGER NOT NULL, emi REAL NOT NULL, total_interest REAL NOT NULL, total_payment REAL NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))');

function jsonResponse(int $status, array $body) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($body);
    exit;
}
function requestBody(): array {
    $body = json_decode(file_get_contents('php://input'), true);
    return is_array($body) ? $body : [];
}
function currentUser(): ?array { return $_SESSION['user'] ?? null; }
function requireUser(): array { $user = currentUser(); if (!$user) jsonResponse(401, ['error' => 'Please sign in first.']); return $user; }

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/') {
    header('Content-Type: text/html; charset=utf-8');
    readfile($baseDir . DIRECTORY_SEPARATOR . 'index.html');
    exit;
}
if ($_SERVER['REQUEST_METHOD'] === 'GET' && in_array($path, ['/style.css', '/app.js'], true)) return false;
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/api/me') jsonResponse(200, ['user' => currentUser()]);
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/api/calculations') {
    $user = requireUser();
    $statement = $db->prepare('SELECT * FROM calculations WHERE user_id = ? ORDER BY id DESC');
    $statement->execute([$user['id']]);
    jsonResponse(200, ['calculations' => $statement->fetchAll(PDO::FETCH_ASSOC)]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(404, ['error' => 'Not found']);
$data = requestBody();
if ($path === '/api/request-otp') {
    $action = $data['action'] ?? '';
    $name = trim((string)($data['name'] ?? ''));
    $email = strtolower(trim((string)($data['email'] ?? '')));
    $password = (string)($data['password'] ?? '');
    if (!in_array($action, ['login', 'signup'], true) || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) jsonResponse(400, ['error' => 'Enter a valid email and a password of at least 6 characters.']);
    if ($action === 'signup') {
        if (strlen($name) < 2) jsonResponse(400, ['error' => 'Please enter your name.']);
        $check = $db->prepare('SELECT 1 FROM users WHERE email = ?'); $check->execute([$email]);
        if ($check->fetch()) jsonResponse(409, ['error' => 'An account with this email already exists.']);
    } else {
        $check = $db->prepare('SELECT password_hash FROM users WHERE email = ?'); $check->execute([$email]); $user = $check->fetch(PDO::FETCH_ASSOC);
        if (!$user || !password_verify($password, $user['password_hash'])) jsonResponse(401, ['error' => 'Email or password is incorrect.']);
    }
    $otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $_SESSION['pending_otps'][$email] = ['code' => $otp, 'expires' => time() + 600, 'action' => $action, 'name' => $name, 'password' => $password];
    jsonResponse(200, ['message' => 'A new verification code was generated.', 'development_otp' => $otp]);
}
if ($path === '/api/verify-otp') {
    $email = strtolower(trim((string)($data['email'] ?? ''))); $otp = trim((string)($data['otp'] ?? ''));
    $pending = $_SESSION['pending_otps'][$email] ?? null; unset($_SESSION['pending_otps'][$email]);
    if (!$pending || $pending['expires'] < time() || !hash_equals($pending['code'], $otp)) jsonResponse(401, ['error' => 'This verification code is invalid or expired. Request a new one.']);
    if ($pending['action'] === 'signup') {
        try { $add = $db->prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)'); $add->execute([$pending['name'], $email, password_hash($pending['password'], PASSWORD_DEFAULT)]); $user = ['id' => (int)$db->lastInsertId(), 'name' => $pending['name'], 'email' => $email]; }
        catch (PDOException) { jsonResponse(409, ['error' => 'An account with this email already exists.']); }
    } else { $get = $db->prepare('SELECT id,name,email FROM users WHERE email = ?'); $get->execute([$email]); $user = $get->fetch(PDO::FETCH_ASSOC); if (!$user) jsonResponse(401, ['error' => 'Account not found. Please log in again.']); }
    $_SESSION['user'] = $user; jsonResponse(200, ['user' => $user]);
}
if ($path === '/api/logout') { session_destroy(); jsonResponse(200, ['ok' => true]); }
if ($path === '/api/calculations') {
    $user = requireUser();
    try {
        $name = substr(trim((string)($data['loan_name'] ?? 'My loan')), 0, 60) ?: 'My loan';
        $principal = (float)($data['principal'] ?? 0); $rate = (float)($data['annual_rate'] ?? -1); $months = (int)($data['tenure_months'] ?? 0);
        if ($principal <= 0 || $rate < 0 || $months <= 0) throw new Exception();
        $monthlyRate = $rate / 1200; $emi = $monthlyRate == 0 ? $principal / $months : $principal * $monthlyRate * pow(1 + $monthlyRate, $months) / (pow(1 + $monthlyRate, $months) - 1); $total = $emi * $months;
        $add = $db->prepare('INSERT INTO calculations(user_id,loan_name,principal,annual_rate,tenure_months,emi,total_interest,total_payment) VALUES(?,?,?,?,?,?,?,?)');
        $add->execute([$user['id'], $name, $principal, $rate, $months, $emi, $total - $principal, $total]);
        jsonResponse(201, ['id' => (int)$db->lastInsertId(), 'emi' => $emi]);
    } catch (Throwable) { jsonResponse(400, ['error' => 'Please enter valid loan details.']); }
}
jsonResponse(404, ['error' => 'Not found']);
