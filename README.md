# Loan EMI Calculator — Vercel version

This is a static Vercel-ready version of the Loan EMI Calculator. No PHP, SQLite, server, environment variables, or database setup is required.

## Deploy to Vercel

1. Upload the contents of this folder to a new GitHub repository, or import the folder in Vercel.
2. In Vercel, choose **Framework Preset: Other**.
3. Leave the build command and output directory blank, then click **Deploy**.

The calculator, accounts, and saved plans work directly in the browser. Accounts and plans are saved only in that browser using local storage; they are not shared between devices.

## Why this version works on Vercel

The original project needs PHP routing, sessions, and SQLite. Vercel static hosting does not run that setup, which caused the `404 NOT_FOUND` page. This version uses only HTML, CSS, and JavaScript, so Vercel can serve it directly.
