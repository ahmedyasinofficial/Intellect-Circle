# Intellect Circle - Supabase Deployment & Migration Guide

Follow these steps to deploy the relational database and connect it to your Intellect Circle production deployment on Vercel.

---

## Step 1: Initialize Database Tables & RLS Policies

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and select **SQL Editor** from the left navigation panel.
3. Click **New Query** to open a fresh editor workspace.
4. Copy the entire contents of the [supabase_schema.sql](file:///Users/ahmadyasin/Downloads/Intellect%20Circle%20Website/supabase_schema.sql) file and paste it into the editor.
5. Click **Run** (or press `Cmd + Enter` / `Ctrl + Enter`).
6. Verify that all tables show a status of "Success" and the default seeds are created.

---

## Step 2: Enable Email/Password Auth Provider

1. On your Supabase Project Dashboard, go to **Authentication** (User icon on the left).
2. Go to **Providers** under the settings section.
3. Locate the **Email** provider.
4. Ensure **Enable Email Provider** is toggled **ON**.
5. Ensure **Confirm Email** is toggled **OFF** (unless you want admins to verify their emails before login, which is optional).
6. Click **Save**.

---

## Step 3: Create your Admin User

1. In the **Authentication** section, click **Users** -> **Add User** -> **Create User**.
2. Input the admin's email and password.
3. Click **Create User**.
4. Take note of the **User UID (UUID)** created for this user.
5. Go to the **Table Editor** on the left panel, select the `admin_users` table.
6. Insert a row matching the user's UUID:
   - `id`: The User UUID from step 4.
   - `email`: The admin's email.
   - `role`: Select `super_admin` or `admin`.
7. Click **Save Row**.

---

## Step 4: Configure Storage Buckets

The schema file will automatically register policies for a bucket named `media`. If the bucket was not auto-provisioned:
1. In the Supabase dashboard, go to **Storage** (Box icon on the left).
2. Click **New Bucket**.
3. Name it exactly `media`.
4. Toggle **Public Bucket** to **ON** (allows public read downloads).
5. Click **Create Bucket**.

---

## Step 5: Configure Vercel Environment Variables

In your Vercel Project Dashboard, go to **Settings** -> **Environment Variables** and add the following keys:

| Key | Value Source / Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project API URL (e.g. `https://xxxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase project public anon key |
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` (for backend serverless API functions) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase **service_role** API key (extremely secure, keep private) |
| `ADMIN_SESSION_SECRET` | A secure, random string (e.g. `intellect_circle_secret_2026`) used to sign auth states |

---

## Step 6: Deploy to Production

Deploy the updated branch to Vercel. Vercel will automatically compile the frontend and provision the serverless endpoints under `api/` to securely write, upload, and read from Supabase.
