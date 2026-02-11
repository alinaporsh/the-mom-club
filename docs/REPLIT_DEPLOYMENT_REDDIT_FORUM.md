# Deploying Reddit-Like Forum Version on Replit

This guide explains how to deploy the **Reddit-like forum version** (with communities/subreddits) as a separate app on Replit.

## Overview

This version includes:
- **Communities/Subreddits**: Multiple communities users can join (like Reddit)
- **Community-specific posts**: Posts belong to specific communities
- **Join/Leave communities**: Users can join or leave communities
- **Filters and sorting**: Filter by tags, sort by newest/top/most commented
- **All other features**: Events, profile, auth, etc. remain the same

## Differences from Simple Forum Version

| Feature | Simple Forum | Reddit-Like Forum |
|---------|-------------|-------------------|
| Forum Structure | Single forum | Multiple communities (subreddits) |
| Posts | All posts in one list | Posts organized by community |
| Navigation | Direct to posts | Browse communities → community → posts |
| Data Storage | Supabase database | Mock data (AsyncStorage) for demo |
| Branch | `main` | `reddit-forum` |

## Step 1: Create a New Replit Project

### Option A: Import from GitHub Branch (Recommended)

1. **Go to Replit**: Visit [replit.com](https://replit.com) and sign in
2. **Create New Repl**:
   - Click the "+" button (Create Repl)
   - Select "Import from GitHub"
   - Enter repository URL: `https://github.com/alinaporsh/the-mom-club`
   - **Important**: After import, switch to the `reddit-forum` branch:
     ```bash
     git checkout reddit-forum
     ```

### Option B: Clone and Switch Branch

1. **Create a new Node.js Repl** in Replit
2. **In the Shell**, run:
   ```bash
   git clone https://github.com/alinaporsh/the-mom-club.git .
   git checkout reddit-forum
   ```

## Step 2: Configure Environment Variables

1. **In Replit, click on the "Secrets" tab** (lock icon in the left sidebar)
2. **Add these secrets**:
   - Key: `EXPO_PUBLIC_SUPABASE_URL`
     Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   
   - Key: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
     Value: Your Supabase anon/public key

3. **Get your Supabase credentials**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings → API
   - Copy "Project URL" and "anon/public" key

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

## Step 4: Configure Replit for Deployment

The `.replit` file should already be configured, but verify it contains:

```
language = "nodejs"
run = "cd the-mom-club && npm run build:web && npm run start:deploy"

[deploy]
publicDir = "/the-mom-club/dist"

[deployment]
build = "cd the-mom-club && npm run build:web"
run = "cd the-mom-club && npm run start:deploy"

[env]
EXPO_PUBLIC_SUPABASE_URL = "your-url-here"
EXPO_PUBLIC_SUPABASE_ANON_KEY = "your-key-here"
```

**Note**: The `[env]` section in `.replit` is optional if you're using Secrets (recommended).

## Step 5: Build and Deploy

1. **Build the web version**:
   ```bash
   cd the-mom-club
   npm run build:web
   ```

2. **Start the server**:
   ```bash
   npm run start:deploy
   ```

3. **Or use Replit's Run button** - it will automatically build and start

## Step 6: Access Your App

Once deployed, Replit will provide a URL like:
- `https://your-repl-name.your-username.repl.co`

You can access the Reddit-like forum version at this URL.

## Key Features of Reddit-Like Version

### Communities (Subreddits)

The app includes these pre-configured communities:
- **Pregnancy & Bump Chat**: For expecting mothers
- **Newborn & Sleep Support**: For new mothers (0-12 months)
- **Feeding & First Foods**: About breastfeeding, formula, and solids

### Community Features

- **Browse Communities**: See all available communities on the Forum tab
- **Join/Leave**: Tap "Join" to join a community
- **Community Pages**: Each community has its own page with:
  - Community description and rules
  - Posts filtered by that community
  - Filter and sort options
  - "About" tab with community info

### Post Features

- **Create Posts**: Create posts within specific communities
- **Filter by Tags**: Filter posts by topic tags
- **Sort Options**: Sort by Newest, Top (votes), or Most Commented
- **Content Type Filters**: Filter by Text, Photo, or All
- **Voting**: Upvote/downvote posts and comments
- **Comments**: Nested comment threads

## Important Notes

### Mock Data

⚠️ **This version uses mock data stored in AsyncStorage** (local browser storage). This means:
- Communities and posts are stored locally in the browser
- Data persists per device/browser
- Data is NOT synced across devices
- This is perfect for demos but not production-ready

### Database Integration

To make this production-ready, you would need to:
1. Create a `communities` table in Supabase
2. Add `community_id` to `forum_posts` table
3. Create a `community_members` table for join/leave functionality
4. Update `CommunityForumContext.tsx` to use Supabase instead of AsyncStorage

### Current Database Schema

The current database schema supports:
- ✅ User authentication and profiles
- ✅ Forum posts and comments (but not community-specific)
- ✅ Events and bookings
- ✅ Votes (from migration 015)

**Missing for Reddit-like version**:
- ❌ Communities table
- ❌ Community memberships table
- ❌ Community-specific post filtering in database

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution**:
```bash
cd the-mom-club
rm -rf node_modules package-lock.json
npm install
```

### Issue: Build fails

**Solution**:
1. Make sure you're on the `reddit-forum` branch:
   ```bash
   git branch
   ```
2. Clear Expo cache:
   ```bash
   cd the-mom-club
   npx expo start --clear
   ```

### Issue: Communities not showing

**Solution**:
- This version uses hardcoded communities in `CommunityForumContext.tsx`
- Check that the file exists: `the-mom-club/contexts/CommunityForumContext.tsx`
- Verify `CommunityForumProvider` is in `app/_layout.tsx`

### Issue: Posts not saving

**Solution**:
- Posts are saved to AsyncStorage (local storage)
- Clear browser storage if you want to reset
- Data persists per browser/device

## Testing the Reddit-Like Version

1. **Browse Communities**:
   - Go to Forum tab
   - See list of communities
   - Search for communities

2. **Join a Community**:
   - Tap on a community
   - Tap "Join" button
   - See "Joined" badge

3. **Create a Post**:
   - Go to a community you've joined
   - Tap "Start a thread"
   - Fill in title and body
   - Optionally add an image
   - Submit

4. **Filter and Sort**:
   - Use the Filters button
   - Select tags, sort order, content type
   - Apply filters

5. **Vote and Comment**:
   - Upvote/downvote posts
   - Add comments
   - Reply to comments (nested threads)

## Comparison: Simple vs Reddit-Like

### Simple Forum (main branch)
- ✅ Single forum, all posts together
- ✅ Database-backed (Supabase)
- ✅ Production-ready
- ✅ Simpler navigation

### Reddit-Like Forum (reddit-forum branch)
- ✅ Multiple communities (subreddits)
- ✅ Community-specific posts
- ✅ Join/leave communities
- ✅ Advanced filtering
- ⚠️ Mock data (AsyncStorage)
- ⚠️ Demo-ready, not production-ready

## Next Steps

1. **For Demo**: Use this version as-is - it works great for demos!
2. **For Production**: 
   - Create database migrations for communities
   - Update `CommunityForumContext.tsx` to use Supabase
   - Add community management features
   - Add admin features for creating communities

## Support

- **Replit Docs**: [docs.replit.com](https://docs.replit.com)
- **Expo Docs**: [docs.expo.dev](https://docs.expo.dev)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

---

**Your Reddit-like forum version should now be running on Replit!** 🎉

Remember: This version is on the `reddit-forum` branch and uses mock data for communities. Perfect for demos!
