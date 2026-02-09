# The Mom Club - MVP

> A supportive community platform for expecting and postpartum mothers

**The Mom Club** is a mobile app that connects expecting and new mothers through a supportive community, providing access to forums, educational classes, and resources during pregnancy and early parenthood.

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Running on Replit](#running-on-replit)
  - [Running Locally](#running-locally)
  - [Supabase Configuration](#supabase-configuration)
- [Usage Guide](#usage-guide)
  - [Creating an Account](#creating-an-account)
  - [Logging In with OTP](#logging-in-with-otp)
  - [Joining as Free or Paid Member](#joining-as-free-or-paid-member)
  - [Using the Forum](#using-the-forum)
  - [Viewing Events and Booking Classes](#viewing-events-and-booking-classes)
- [Architecture](#architecture)
- [Supabase Schema](#supabase-schema)
- [Preview Build (Android)](#preview-build-android)
- [AI Tools Disclosure](#ai-tools-disclosure)
- [Future Improvements](#future-improvements)
- [Credits](#credits)
- [License](#license)

---

## Overview

### The Problem

Expecting and postpartum mothers often experience isolation during pregnancy and early parenthood. They lack access to a dedicated, supportive community where they can:
- Connect with other mothers going through similar experiences
- Access evidence-based resources and educational content
- Find and book classes without leaving home
- Get support without wading through generic forums

### The Solution

The Mom Club provides a mobile-first platform where mothers can:
- **Connect**: Join a supportive community forum to share experiences and advice
- **Learn**: Access workshops and classes led by experts in prenatal and postpartum care
- **Grow**: Track their journey from pregnancy through early motherhood
- **Belong**: Feel part of a village that supports them every step of the way

### Target Audience

- **Expecting mothers**: Women who are pregnant and preparing for motherhood
- **New mothers**: Women in the postpartum period (0-12 months after birth)
- **Support seekers**: Anyone looking for evidence-based information and community support

### Key Value Proposition

Unlike generic social networks or overwhelming parenting forums, The Mom Club offers:
- **Focused community**: Only expecting and new mothers, creating a safe and relevant space
- **Expert-led classes**: Workshops from certified instructors (prenatal yoga, lactation support, etc.)
- **Role-based access**: Guest browsing, free tier, and paid membership with clear benefits
- **Privacy-first**: Secure authentication, role-based permissions, and data protection

---

## Core Features

### Authentication & Onboarding
- **Email/OTP Authentication**: Secure, passwordless login with email verification codes
- **Guest Mode**: Browse content without creating an account
- **Onboarding Flow**: New users complete a profile (pregnancy status, due date/baby age, name)
- **Session Management**: Automatic session persistence and token refresh

### Role-Based Access Control
- **Guest**: Browse forum posts and events (read-only)
- **Free Member**: Create posts, comment, view events, book classes (with per-class payment)
- **Paid Member**: All free features + included class bookings (no per-class fees)
- **Admin**: Content moderation, event management, user management

### Community Forum
- **Browse Posts**: View all community discussions
- **Create Posts**: Share experiences, ask questions (free/member/admin only)
- **Comment**: Reply to posts and engage in discussions (free/member/admin only)
- **Moderation**: Admins can delete inappropriate content

### Events & Classes
- **Class Schedule**: View upcoming workshops and classes
- **Event Details**: See instructor, time, location, and pricing
- **Booking System**: Reserve spots in classes
- **Payment Flow**: Free members see mock payment modal; paid members book without extra fees
- **Admin Tools**: Create, edit, and delete events

### Profile Management
- **View Profile**: See personal information and membership status
- **Edit Profile**: Update name, pregnancy status, due date, or baby age
- **Membership Upgrade**: Prompt to upgrade from free to paid membership
- **Session Info**: View current role and access level

---

## Installation

### Prerequisites

Before running The Mom Club, ensure you have:

- **Node.js** 18+ and npm
- **Expo CLI**: Install globally with `npm install -g expo-cli`
- **Supabase Account**: Free account at [supabase.com](https://supabase.com)
- **Mobile Testing Environment**:
  - iOS Simulator (Mac only) via Xcode
  - Android Emulator via Android Studio
  - OR Expo Go app on physical device (iOS/Android)

### Running on Replit

1. **Fork or Import Project**
   - Go to [Replit](https://replit.com)
   - Import this repository or create a new Node.js repl
   - Upload the project files

2. **Install Dependencies**
   ```bash
   cd the-mom-club
   npm install
   ```

3. **Set Environment Variables**
   - In Replit, go to "Secrets" (lock icon in sidebar)
   - Add the following secrets:
     ```
     EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
     ```

4. **Start the Development Server**
   ```bash
   npx expo start
   ```

5. **Access the App**
   - Replit will provide a URL or QR code
   - Open in Expo Go app on your phone
   - OR use the web preview (limited mobile features)

**Note**: Expo on Replit may have limitations (no hot reload, slower builds). Local development is recommended for best experience.

### Running Locally

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd test-task-geex/the-mom-club
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   
   Create a `.env` file in the `the-mom-club/` directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   Get these values from your Supabase project:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings → API
   - Copy "Project URL" and "anon/public" key

4. **Start the Development Server**
   ```bash
   npx expo start
   ```

5. **Open the App**
   - Press `i` for iOS simulator (Mac only)
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `w` for web browser (limited features)

### Supabase Configuration

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose organization and project name
4. Set a strong database password (save it securely)
5. Select a region close to your users
6. Wait for project to provision (~2 minutes)

#### Run Database Migrations

1. **Install Supabase CLI** (optional but recommended):
   ```bash
   brew install supabase/tap/supabase  # Mac
   # OR
   npm install -g supabase             # Any platform
   ```

2. **Run Migrations via Dashboard**:
   - Go to Supabase Dashboard → SQL Editor
   - Open and execute each migration file in order:
     - `supabase/migrations/001_initial.sql`
     - `supabase/migrations/002_forum_allow_free.sql`
     - `supabase/migrations/003_admin_policies.sql`
     - `supabase/migrations/004_add_profile_fields.sql`
     - `supabase/migrations/005_fix_duplicate_signup.sql`
     - `supabase/migrations/006_add_event_images.sql`
     - `supabase/migrations/007_remove_duplicate_events.sql`
     - `supabase/migrations/008_fix_event_times.sql`
     - `supabase/migrations/009_add_event_prices_and_booking_policy.sql`
     - `supabase/migrations/010_add_email_exists_function.sql`

3. **Deploy Edge Functions** (optional, for enhanced features):
   ```bash
   supabase functions deploy onboarding-complete
   supabase functions deploy validate-membership
   ```

#### Configure Email Templates

For OTP codes to work properly:

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Select "Magic Link" template
3. Ensure the template includes: `{{ .Token }}` to display the OTP code
4. Example template:
   ```html
   <h2>Your verification code</h2>
   <p>Your code: <strong>{{ .Token }}</strong></p>
   <p>Enter this code in the app to verify your email.</p>
   ```

#### Troubleshooting Setup

**OTP Emails Not Arriving:**
- Check spam/junk folder
- Verify email template includes `{{ .Token }}`
- Check Supabase → Authentication → Users to confirm user was created
- Try with a different email provider (Gmail, Outlook, etc.)
- Check rate limits in Supabase Dashboard

**Database Errors:**
- Ensure all migrations ran successfully (check SQL Editor history)
- Verify RLS is enabled: `SELECT schemaname, tablename FROM pg_tables WHERE rowsecurity = true;`
- Check that `get_my_role()` function exists: Dashboard → Database → Functions

**Connection Issues:**
- Verify environment variables are loaded (restart dev server after changes)
- Check that Supabase URL and key are correct (Settings → API)
- Ensure your IP isn't blocked (Supabase free tier allows all IPs by default)

---

## Usage Guide

### Creating an Account

1. **Launch the App**
   - Open the app in Expo Go or simulator

2. **Sign Up**
   - On the welcome screen, tap "Continue as Guest" to browse, or tap "Sign In / Sign Up"
   - Enter your email address
   - Tap "Send Code"

3. **Verify Email**
   - Check your email for an 8-digit verification code
   - Enter the code in the app
   - Tap "Verify"

4. **Complete Onboarding**
   - Select your status: "Pregnant" or "New Mom"
   - If pregnant: Enter your due date
   - If new mom: Enter your baby's age (e.g., "3 months")
   - Enter your name
   - Tap "Complete Onboarding"

5. **Welcome!**
   - You're now a Free member
   - Explore the Home screen with content cards

### Logging In with OTP

**Returning Users:**

1. Open the app and tap "Sign In / Sign Up"
2. Enter your email address
3. Tap "Send Code"
4. Check email for new OTP code
5. Enter code and tap "Verify"
6. You'll be taken to the Home screen (skipping onboarding)

**Guest Mode:**

- Tap "Continue as Guest" to browse without signing in
- Guests can view forum posts and events but cannot post, comment, or book

### Joining as Free or Paid Member

**Free Member (Default):**
- Automatically assigned after completing onboarding
- Can create forum posts and comments
- Can book events with per-class payment

**Paid Member:**
- Upgrade from Profile screen
- All class bookings included (no per-class fees)
- Access to member-only events (future feature)
- Note: Payment integration is mocked in MVP; real payments would be handled via Stripe

**To Upgrade:**
1. Go to Profile tab
2. Tap "Upgrade to Member" button
3. (In MVP: Mock payment flow)
4. Membership updated manually in database for testing

**For Testing Paid Features:**
- Use Supabase Dashboard → Table Editor
- Find your user in `memberships` table
- Change `role` from 'free' to 'member'
- Reload the app to see updated access

### Using the Forum

**Browse Posts:**
1. Tap "Community" tab at bottom
2. Scroll through recent posts
3. Tap any post to read full content and comments

**Create a Post:**
1. Go to Community tab
2. Tap "+" or "New Post" button
3. Enter post title and body
4. Tap "Post"
5. Your post appears in the feed

**Comment on Posts:**
1. Open a post by tapping it
2. Scroll to comments section at bottom
3. Type your comment
4. Tap "Send" or "Comment"

**Requirements:**
- Must be signed in (not guest)
- Must be Free, Member, or Admin role
- Guests can view but not create/comment

### Viewing Events and Booking Classes

**Browse Events:**
1. Tap "Schedule" tab at bottom
2. See list of upcoming classes and workshops
3. Each card shows: title, instructor, date/time, location

**View Event Details:**
1. Tap any event card
2. See full description, pricing, and booking button
3. Check if spots are available

**Book a Class:**
1. From event detail screen, tap "Book Event"
2. **If Free Member**: Mock payment modal appears
   - Enter mock card details
   - Tap "Pay" to confirm
3. **If Paid Member**: Booking confirmed immediately (included in membership)
4. See confirmation message
5. Check Profile → My Bookings to see your reservations

**Cancel a Booking:**
1. Go to Profile tab
2. View "My Bookings" section
3. Tap booking to see details
4. Tap "Cancel Booking" (if available)

**Admin: Create Events**
1. Go to Schedule tab (must be Admin role)
2. Tap "+" or "Add Event" button
3. Fill in event details:
   - Title, description
   - Start and end time
   - Instructor name
   - Location
   - Price (for free members)
   - Image URL (optional)
4. Tap "Create Event"

---

## Architecture

The Mom Club follows a modern mobile-first architecture with three main layers:

### High-Level Architecture

```
┌─────────────────────────────────────┐
│     Mobile App (Expo/React Native)  │
│  - Auth, Forum, Events, Profile UI  │
└───────────────┬─────────────────────┘
                │
                │ REST API / Real-time
                ▼
┌─────────────────────────────────────┐
│       Supabase Backend              │
│  - PostgreSQL Database              │
│  - Authentication (Email/OTP)       │
│  - Row Level Security (RLS)         │
│  - Edge Functions (Serverless)      │
└───────────────┬─────────────────────┘
                │
                │ SMTP
                ▼
┌─────────────────────────────────────┐
│      External Services              │
│  - Email Provider (OTP Delivery)    │
└─────────────────────────────────────┘
```

### Key Architectural Decisions

**Mobile-First with Expo**
- Cross-platform (iOS + Android) from single codebase
- Fast development with hot reload
- Built-in APIs for device features

**Supabase Backend**
- Instant backend without managing servers
- PostgreSQL with automatic REST API
- Built-in authentication and real-time subscriptions
- Row Level Security for data protection

**Passwordless Authentication**
- Email/OTP flow (no passwords to manage)
- More secure and user-friendly
- Reduces support burden

**Role-Based Access Control**
- Enforced at database level with RLS policies
- UI gating for better UX
- Four roles: guest, free, member, admin

---

## Supabase Schema

### Database Tables

The app uses 6 core tables:

1. **`profiles`** - User profiles
   - Extends Supabase Auth users
   - Stores name, email, pregnancy status, due date/baby age
   - Created automatically on signup via trigger

2. **`memberships`** - User roles
   - Stores user role (guest, free, member, admin)
   - One record per user
   - Default role: 'free' (assigned during onboarding)

3. **`forum_posts`** - Community posts
   - User-generated forum discussions
   - Title, body, author, timestamps
   - Everyone can read; free/member/admin can create

4. **`forum_comments`** - Post comments
   - Replies to forum posts
   - Links to post and author
   - Everyone can read; free/member/admin can create

5. **`events`** - Classes and workshops
   - Title, description, instructor, time, location, price
   - Everyone can read; admin can create/edit/delete

6. **`bookings`** - Event reservations
   - Links user to event
   - Tracks booking status
   - Users can book their own; admin can manage all

### Row Level Security (RLS)

All tables have RLS enabled with policies enforcing:
- **Public read**: Forum posts and events are readable by everyone
- **Authenticated write**: Must be signed in to create content
- **Role-based access**: Some actions require specific roles (e.g., member to book events)
- **Owner-only update**: Users can only edit their own content

Example policy:
```sql
CREATE POLICY "forum_posts_insert_member" ON forum_posts
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  get_my_role() IN ('member', 'admin')
);
```

### Edge Functions

**`onboarding-complete`**
- Creates user profile and assigns default 'free' role
- Called when user completes onboarding form
- Updates profile with name, status, due date/baby age

**`validate-membership`**
- Checks if user has required role for an action
- Returns user's current role
- Used for permission checks in the app

### Migrations

Database schema is version-controlled with migration files:
- Located in `supabase/migrations/`
- 10 migration files from `001_initial.sql` to `010_add_email_exists_function.sql`
- Run in order via Supabase SQL Editor

For full schema documentation, see [Assignment Deliverable](../docs/ASSIGNMENT_PART2_PART3_Deliverable.md) and `supabase/migrations/`.

---

## Preview Build (Android)

TestFlight (iOS) was not used for this project because it requires a paid Apple Developer account. Instead, an **Android preview build** was created with EAS Build for testing and demonstration.

| Item        | Details |
| ----------- | ------- |
| **Platform** | Android (preview) |
| **Build**    | EAS Build |
| **Link**     | [Android preview build on Expo](https://expo.dev/accounts/alinayasmine/projects/the-mom-club/builds/5ce57372-56b0-4b1d-af91-be8386ce2040) |

---

## AI Tools Disclosure

This project was developed with a combination of AI assistance and manual engineering. Here's a transparent breakdown:

### AI-Assisted Components

**Planning (30% AI, 70% Manual)**
- Product brief structure: AI-assisted outline, manual content and decisions
- Project timeline and Gantt chart: AI-drafted structure, manual planning and adjustments
- Scope definition and prioritization: Primarily manual decision-making
- User roles and permission matrix: Manual analysis with AI formatting assistance

**Documentation (70% AI, 30% Manual)**
- Architecture diagrams (Mermaid): AI-generated, manually validated
- README structure and content: AI-drafted, manually edited for clarity
- Technical documentation: AI-generated with manual review and refinement
- Code comments and inline docs: AI-assisted, manually verified

**Database Schema & Backend (80% AI, 20% Manual)**
- Supabase schema design: AI-generated based on requirements
- RLS policies: AI-generated logic, manually tested and refined
- Database triggers and helper functions: AI-generated, manually debugged
- Migration files: AI-scaffolded, manually organized and sequenced
- Edge functions: AI-scaffolded with CORS and error handling manually adjusted

**Mobile App Code - React Native Expo (80% AI, 20% Manual)**
- Screen components: AI-generated boilerplate, manually styled and refined
- Navigation structure (Expo Router): AI-scaffolded, manually configured
- AuthContext and session management: AI-generated logic, manually debugged
- Form validation and error handling: AI-assisted, manually enhanced
- React Query integration: AI-suggested patterns, manually implemented

**Testing & Integration (10% AI, 90% Manual)**
- Test case generation: Minimal AI assistance
- Supabase client setup and configuration: Manual
- Auth state management and redirect logic: Manual
- Onboarding flow edge cases: Manual testing and fixes
- Testing across different roles (guest, free, member, admin): Manual
- Cross-platform testing (iOS and Android): Manual

**Design Decisions (100% Manual)**
- Technology stack selection (Expo, Supabase, React Query)
- Role-based access control model
- Database normalization and relationships
- UI/UX flow and information architecture
- Feature scope and MVP prioritization

### AI Tools Used

1. **Cursor** - coding assistant
   - Claude Opus 4.5: for longer thinking and Code generation.
   - Claude Sonnet 4.5: Documentation writing
   - Claude Sonnet 4.5: Debugging support
   - Gemeni 3 pro: UI and scaffolding. 

2. **ChatGPT 5.2 (OpenAI)** - Secondary assistant
   - Schema design assistance
   - Alternative approaches and ideas
   - Documentation proofreading
   - SQL query optimization suggestions

3. **Replit AI** - Hosting and deployment
   - Replit project setup and configuration
   - Deployment and health-check troubleshooting
   - Environment and run/build configuration for Replit

4. **Supabase AI Assistant** - Database queries
   - RLS policy suggestions
   - SQL query optimization

### Intentionally Excluded from MVP

Due to the 2-day timeline, the following were explicitly out of scope:
- **Payments**: Real Stripe integration (only UI mockup included)
- **Advanced UI**: Loading skeletons, animations, accessibility enhancements
- **Forum Enhancements**: Likes, nested comments, search, filtering
- **Profile Fields**: Full profile customization (height, weight, interests)
- **Notifications**: Push notifications for new posts or event reminders
- **Real-time**: Live updates using Supabase Realtime subscriptions
- **Content Library**: CMS for articles and educational resources
- **Provider Marketplace**: Directory for doulas, lactation consultants, etc.
- **TestFlight**: App Store submission and beta distribution
- **AI features**: Advanced metrics and personalized features.
---

## Future Improvements

Given **one additional week** of development time, here are the features we would prioritize:

### Week +1 Priorities

**1. Real Payment Integration (Days 1-2)**
- Integrate Stripe for membership subscriptions
- Add per-class payment flow for free members
- Implement webhook handlers for payment events
- Add subscription management (cancel, upgrade)
- Build admin dashboard for payment tracking

**2. UI/UX Polish (Days 3-4)**
- Multi-step onboarding with progress indicator
- Loading skeletons for content lists
- Better empty states with illustrations
- Improved error messages and retry logic
- Accessibility improvements (ARIA labels, screen reader support)
- Dark mode support

**3. Forum Enhancements (Day 5)**
- Comment input directly on post detail screen (currently missing)
- Like/reaction buttons for posts and comments
- Basic moderation tools (flag content, report abuse)
- Post categories/tags for better organization
- Search and filter functionality

**4. Push Notifications (Day 6)**
- Set up OneSignal or Firebase Cloud Messaging
- Notification preferences in profile settings
- Event reminders (1 day before, 1 hour before)
- New post alerts for followed topics
- Comment reply notifications

**5. TestFlight & Production (Day 7)**
- Configure EAS Build for iOS and Android
- Submit to TestFlight for beta testing
- Gather beta tester feedback
- Fix critical bugs discovered in testing
- Prepare for App Store submission

### Long-Term Enhancements (Beyond +1 Week)

**Enhanced Community Features**
- Direct messaging between members
- Groups/circles for specific topics (breastfeeding, sleep training, etc.)
- Member profiles with bio and badges
- Follow other members
- Mention/tag system (@username)

**Content & Education**
- Content library with articles, videos, podcasts
- Expert Q&A sessions (live or async)
- Weekly challenges or activities
- Resource recommendations based on pregnancy stage
- Integration with health trackers (Apple Health, Google Fit)

**Provider Marketplace**
- Directory of verified providers (doulas, lactation consultants, therapists)
- Provider profiles with reviews and ratings
- Direct booking integration
- Video consultation support
- Insurance information

**Advanced Features**
- AI-powered health insights (mood tracking, symptom logging)
- Personalized content recommendations
- Multi-language support
- Offline mode with sync
- Social sharing to external platforms

**Technical Improvements**
- Real-time updates with Supabase Realtime
- Advanced caching strategies
- Image upload and compression
- Video content support
- Analytics and user behavior tracking
- A/B testing framework
- Comprehensive error monitoring (Sentry)

---

## Credits

### Development Team
- **Lead Developer**: Alina Yasmine
- **Project Duration**: 2 days (Feb 10-11, 2026)
- **Development Approach**: Agile, AI-assisted rapid prototyping

### Technologies & Services
- **Mobile Framework**: [Expo](https://expo.dev) - React Native platform
- **Backend**: [Supabase](https://supabase.com) - Open source Firebase alternative
- **State Management**: [TanStack Query](https://tanstack.com/query) - React Query for data fetching
- **Navigation**: [Expo Router](https://expo.github.io/router/docs/) - File-based routing
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

### AI Assistants
- **Claude Sonnet 4.5** by Anthropic - Primary coding and documentation assistant
- **ChatGPT** by OpenAI - Secondary assistant for ideation
- **Replit AI** - Hosting and deployment (Replit setup, health checks, build/run configuration)
- **Supabase AI** - Database query assistance

### Inspiration & Resources
- Supabase documentation and tutorials
- Expo documentation and examples
- React Query best practices
- Mobile app security guidelines (OWASP Mobile Security)

### Special Thanks
- The Mom Club concept and requirements provided by project stakeholders
- Open source community for the amazing tools that made rapid development possible
- Beta testers (future) for feedback and suggestions

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 The Mom Club

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Contributing

We welcome contributions! To contribute:

1. **Fork the Repository**
   - Click "Fork" on GitHub
   - Clone your fork: `git clone <your-fork-url>`

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Write clean, well-documented code
   - Follow existing code style and conventions
   - Add tests if applicable

4. **Test Thoroughly**
   - Run the app on iOS and Android
   - Test all affected user flows
   - Ensure no breaking changes

5. **Submit a Pull Request**
   - Push to your fork: `git push origin feature/your-feature-name`
   - Open a PR on the main repository
   - Describe your changes and rationale
   - Link any related issues

### Contribution Guidelines

- **Code Style**: Follow the existing TypeScript and React Native conventions
- **Commit Messages**: Use clear, descriptive commit messages (e.g., "Add forum post search feature")
- **Documentation**: Update README and comments for significant changes
- **Testing**: Test on both iOS and Android before submitting
- **Breaking Changes**: Clearly document any breaking changes

### Reporting Issues

Found a bug or have a feature request?

1. Check existing issues to avoid duplicates
2. Open a new issue with:
   - Clear title and description
   - Steps to reproduce (for bugs)
   - Expected vs. actual behavior
   - Screenshots or videos if applicable
   - Device/OS information

---

## Support

### Getting Help

- **Documentation**: See [Assignment Deliverable](../docs/ASSIGNMENT_PART2_PART3_Deliverable.md) and the `docs/` folder for technical details
- **Project Timeline**: See [`PROJECT_TIMELINE.md`](../PROJECT_TIMELINE.md) for development context
- **Implementation Guides**: Check `docs/` folder for specific feature documentation
- **GitHub Issues**: Search or open an issue for bugs and questions

### Contact

For project-related questions or collaboration inquiries:
- **GitHub**: Open an issue or discussion
- **Email**: [Contact placeholder - add if needed]

---

## Quick Reference

### Useful Commands

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Clear cache
npx expo start --clear

# Run type check
npx tsc --noEmit

# Run linter
npx eslint .
```

### Environment Variables

Required in `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Key File Locations

- **App screens**: `app/` (Expo Router structure)
- **Reusable components**: `components/`
- **Auth context**: `contexts/AuthContext.tsx`
- **Supabase client**: `lib/supabase.ts`
- **Database migrations**: `supabase/migrations/`
- **Edge functions**: `supabase/functions/`

---

**Built with care for expecting and new mothers. 💚**
