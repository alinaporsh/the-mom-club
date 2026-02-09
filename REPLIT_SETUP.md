# Hosting The Mom Club on Replit - Step-by-Step Guide

## Prerequisites

Before starting, make sure you have:
- A GitHub account (you already have: alinaporsh)
- A Replit account (sign up at [replit.com](https://replit.com) if needed)
- Your Supabase project URL and anon key ready

---

## Step 1: Import Your Repository to Replit

1. **Go to Replit**: Visit [replit.com](https://replit.com) and sign in
2. **Create New Repl**:
   - Click the "+" button (Create Repl)
   - Select "Import from GitHub"
   - Enter your repository URL: `https://github.com/alinaporsh/the-mom-club`
   - Click "Import"

**Alternative Method** (if Import from GitHub doesn't work):
- Create a new "Node.js" Repl
- In the Repl, open the Shell and run:
  ```bash
  git clone https://github.com/alinaporsh/the-mom-club.git .
  ```

---

## Step 2: Configure Environment Variables

1. **In Replit, click on the "Secrets" tab** (lock icon in the left sidebar)
2. **Add these two secrets**:
   - Key: `EXPO_PUBLIC_SUPABASE_URL`
     Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   
   - Key: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
     Value: Your Supabase anon/public key

3. **Get your Supabase credentials**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings → API
   - Copy "Project URL" and "anon/public" key

---

## Step 3: Install Dependencies

1. **Open the Shell** in Replit (terminal icon)
2. **Navigate to the app directory**:
   ```bash
   cd the-mom-club
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
   This may take 2-3 minutes.

---

## Step 4: Configure Replit to Run Expo

The `.replit` file is already configured, but verify:

1. **Check that `.replit` file exists** in the root directory
2. **If needed, create/update `.replit`** with:
   ```
   language = "nodejs"
   run = "cd the-mom-club && npm start"
   ```

---

## Step 5: Start the Development Server

1. **Click the "Run" button** in Replit (or press `Ctrl+Enter`)
2. **Wait for Expo to start** - you should see:
   - "Metro waiting on..."
   - A QR code in the terminal
   - Instructions to open in Expo Go

---

## Step 6: Access Your App

### Option A: Use Expo Go (Recommended for Testing)

1. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan the QR code** displayed in Replit terminal with:
   - iOS: Camera app
   - Android: Expo Go app

3. **The app will load** on your phone via Expo Go

### Option B: Use Replit Web Preview (Limited)

- Replit may show a web preview, but React Native features are limited in browser
- Mobile testing via Expo Go is recommended

---

## Step 7: Verify Everything Works

1. **Check the terminal** for any errors
2. **Test the app**:
   - Try signing up with email/OTP
   - Browse the forum
   - View events
   - Check your profile

---

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution**:
```bash
cd the-mom-club
rm -rf node_modules package-lock.json
npm install
```

### Issue: Environment variables not loading

**Solution**:
1. Check Secrets tab has both variables set correctly
2. Restart the Repl (Stop → Run again)
3. Verify variable names match exactly: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Issue: Expo server won't start

**Solution**:
```bash
cd the-mom-club
npx expo start --clear
```

### Issue: Port already in use

**Solution**:
- Stop the current process
- Run: `npx expo start --port 8080`

### Issue: QR code not showing

**Solution**:
- Make sure you're in the `the-mom-club` directory
- Run: `npx expo start --tunnel` (uses Expo's tunnel service)

---

## Important Notes

### Limitations on Replit

- **Mobile Testing**: Replit's web preview won't work well for React Native. Use Expo Go on your phone.
- **Hot Reload**: May be slower than local development
- **Free Tier**: Replit free tier has resource limits; upgrade if you need more
- **Persistence**: Files persist, but always commit important changes to GitHub

### Best Practices

1. **Always commit changes to GitHub**:
   ```bash
   git add .
   git commit -m "Your message"
   git push
   ```

2. **Use Secrets for sensitive data**: Never hardcode Supabase keys in code

3. **Test on real devices**: Use Expo Go for the best testing experience

---

## Quick Reference Commands

```bash
# Navigate to app directory
cd the-mom-club

# Install dependencies
npm install

# Start Expo
npm start
# OR
npx expo start

# Start with tunnel (if QR code issues)
npx expo start --tunnel

# Clear cache and restart
npx expo start --clear

# Check environment variables (in Node.js)
node -e "console.log(process.env.EXPO_PUBLIC_SUPABASE_URL)"
```

---

## Next Steps After Setup

1. **Test all features**:
   - User registration and login
   - Forum posting and commenting
   - Event browsing and booking
   - Profile management

2. **Share your Repl**:
   - Click "Share" button in Replit
   - Copy the Repl link to share with others

3. **Monitor usage**:
   - Check Replit usage dashboard
   - Monitor Supabase dashboard for API usage

---

## Support

- **Replit Docs**: [docs.replit.com](https://docs.replit.com)
- **Expo Docs**: [docs.expo.dev](https://docs.expo.dev)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

---

**Your Repl should now be running!** 🎉

If you encounter any issues, check the Troubleshooting section above or refer to the main README.md for more details.
