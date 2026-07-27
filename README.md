# Loan EMI Calculator

A PHP-based EMI calculator with account creation, login, one-time-password verification, SQLite storage, and saved calculation history.

## Run locally

From this folder, run:

```powershell
php -S 127.0.0.1:8001 router.php
```

Then open `http://localhost:8001` in your browser.

`loan_emi_calculator.db` is created automatically on first start. PHP 8+ with the `pdo_sqlite` extension is required.

## Notes

This is a local demonstration app. A fresh six-digit OTP is generated for every log-in or sign-up request, expires after 10 minutes, and is single-use. The screen displays it only for local testing. For public deployment, send it through an email/SMS provider instead and replace the in-memory sessions with a persistent session store; use Argon2 or bcrypt for password hashes over HTTPS.
