# HelperSync Setup Guide

## Prerequisites
- Node.js 18+ installed
- A Clerk account (clerk.com)
- A Convex account (convex.dev)
- An Anthropic API key (console.anthropic.com)
- A Polar account (polar.sh) — optional for payments

---

## Step 1: Install Dependencies

Open a terminal in this folder and run:

```bash
npm install
```

---

## Step 2: Initialize Convex

```bash
npx convex dev --once
```

This will:
1. Ask you to log in to Convex (opens browser)
2. Create a new Convex project
3. Generate `convex/_generated/` with typed API bindings
4. Output your `NEXT_PUBLIC_CONVEX_URL`

---

## Step 3: Set Up Clerk

1. Go to [clerk.com](https://clerk.com) and create a new application
2. In Clerk Dashboard → **JWT Templates** → Create new → Choose **Convex**
3. Note the **Issuer** URL (looks like `https://your-app.clerk.accounts.dev`)
4. Get your publishable and secret keys from Clerk Dashboard → API Keys

---

## Step 4: Fill in Environment Variables

Edit `.env.local` with your actual keys:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev

NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

ANTHROPIC_API_KEY=sk-ant-...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 5: Push Convex Schema

```bash
npx convex dev
```

Keep this running in a terminal — it watches your Convex files and syncs them to the cloud.

---

## Step 6: Run the App

In a second terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 7: First-Time Flow

1. Sign up as an employer at `/sign-up`
2. Complete the 6-step onboarding wizard
3. On Step 5, copy the invite code
4. Sign up as a helper in incognito/another browser
5. At `/onboarding`, select "I'm a Helper" and enter the invite code

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add all environment variables from `.env.local` to Vercel's environment settings
4. Run `npx convex deploy` for production Convex deployment
5. Update `NEXT_PUBLIC_APP_URL` to your Vercel domain

---

## Optional: Polar Payments

1. Create a product in [polar.sh](https://polar.sh)
2. Get your access token and product ID
3. Add webhook endpoint: `https://your-domain.com/api/webhooks/polar`
4. Add to `.env.local`:
   ```
   POLAR_ACCESS_TOKEN=polar_...
   NEXT_PUBLIC_POLAR_PRODUCT_ID=...
   POLAR_WEBHOOK_SECRET=...
   ```
