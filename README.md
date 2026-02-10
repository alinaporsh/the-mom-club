# The Mom Club - MVP Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue)](https://expo.dev)
[![Built with Expo](https://img.shields.io/badge/Built%20with-Expo-000020.svg)](https://expo.dev)

> A supportive community platform connecting expecting and postpartum mothers through forums, classes, and resources.

**The Mom Club** is a mobile-first MVP built with React Native (Expo) and Supabase, providing a safe, supportive space for mothers during pregnancy and early parenthood.

---

## Quick Start

Get the app running in 5 minutes:

### Prerequisites

- **Node.js 18+** and npm
- **Expo CLI**: `npm install -g expo-cli`
- **Supabase account** (free tier works)
- **iOS Simulator** (Mac), **Android Emulator**, or **Expo Go** app

### Install & Run

```bash
# Clone and navigate to the app
cd the-mom-club

# Install dependencies
npm install

# Configure environment variables
# Create .env file with your Supabase keys
echo "EXPO_PUBLIC_SUPABASE_URL=your_supabase_url" > .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key" >> .env

# Start the development server
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with **Expo Go** app on your phone

---

## Features

- **Email/OTP Authentication** - Passwordless, secure login with email verification codes
- **Role-Based Access Control** - Four distinct roles: Guest, Free, Member, Admin
- **Community Forum** - Create posts with tags and images, comment with image support, vote on content (mocked), filter by category
- **Events & Classes** - Browse and book prenatal/postpartum workshops
- **Profile Management** - Customize profile, track pregnancy status, upgrade membership
- **Admin Tools** - Content moderation, event management, user administration

---

## Project Structure

```
test-task-geex/
├── the-mom-club/          # Expo React Native mobile app
│   ├── app/               # Screens (Expo Router file-based routing)
│   │   ├── (tabs)/        # Tab navigation screens (Home, Forum, Events, Profile)
│   │   ├── auth.tsx       # Email/OTP authentication
│   │   ├── onboarding.tsx # New user onboarding
│   │   ├── forum/         # Forum post detail and creation
│   │   └── events/        # Event detail and booking
│   ├── components/        # Reusable UI components
│   ├── contexts/          # Auth and state management
│   │   └── AuthContext.tsx # Role-based authentication context
│   └── lib/               # Utilities and configuration
│       └── supabase.ts    # Supabase client setup
├── supabase/              # Backend configuration
│   ├── migrations/        # Database schema versions (18 migrations)
│   └── functions/         # Edge Functions (Deno)
│       ├── onboarding-complete/
│       └── validate-membership/
└── docs/                  # Comprehensive documentation
    ├── PROJECT_TIMELINE.md        # 2-day development breakdown
    ├── FUTURE_IMPROVEMENTS.md     # 1+ week roadmap
    ├── ADMIN_MANAGEMENT.md        # Admin user guide
    └── ASSIGNMENT_PART2_PART3_Deliverable.md
```

---

## Technology Stack

### Frontend
- **React Native** 0.81.5 with Expo SDK ~54.0.33
- **TypeScript** - Type-safe development
- **Expo Router** - File-based routing system
- **React Query** (@tanstack/react-query) - Server state management and caching
- **AsyncStorage** - Session persistence

### Backend
- **Supabase** - Backend-as-a-Service platform
  - **PostgreSQL 15+** - Database with PostgREST auto-generated API
  - **Supabase Auth** - Email/OTP authentication
  - **Row Level Security (RLS)** - Database-level permission enforcement
  - **Edge Functions** - Deno-based serverless functions

### Development
- **ESLint** - Code linting
- **Expo Go** - Development testing
- **EAS Build** - Production builds (TestFlight/Play Store)

---

## Documentation

Comprehensive documentation is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| **[Project Timeline](PROJECT_TIMELINE.md)** | 2-day development timeline with Gantt chart, milestones, and planning rationale |
| **[Future Improvements](docs/FUTURE_IMPROVEMENTS.md)** | Roadmap for 1+ week: payments, UI polish, notifications, marketplace |
| **[Admin Management](docs/ADMIN_MANAGEMENT.md)** | Complete guide for managing admin users, security best practices, troubleshooting |
| **[App README](the-mom-club/README.md)** | Detailed app setup, usage guide, installation instructions, AI disclosure |
| **[Assignment Deliverable](docs/ASSIGNMENT_PART2_PART3_Deliverable.md)** | Part 2 & 3 deliverable with timeline and architecture |

---

## Key Decisions

### Why Expo?
**Fast cross-platform development** - Build for iOS and Android simultaneously with hot reload, managed workflow, and built-in APIs. Reduces development time by ~40%.

### Why Supabase?
**Instant backend setup** - PostgreSQL database with auto-generated REST API, built-in authentication, real-time subscriptions, and edge functions. No server management required.

### Why Email/OTP?
**Better UX and security** - No passwords to remember or reset. More secure than weak passwords. Mobile-friendly flow with automatic code verification.

### Why Row Level Security (RLS)?
**Database-level security** - Permissions enforced at the database layer, not just in UI. Even if someone bypasses the app, RLS prevents unauthorized data access.

---

## Development

### Running Locally

```bash
cd the-mom-club
npm install
npx expo start
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations in order via SQL Editor or Supabase CLI:
   ```
   001_initial.sql → 018_forum_comment_images.sql
   ```
3. Deploy edge functions:
   ```bash
   supabase functions deploy onboarding-complete
   supabase functions deploy validate-membership
   ```

### Environment Variables

Create `.env` in `the-mom-club/` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these values from: **Supabase Dashboard → Settings → API**

### Testing Different Roles

By default, new users get `free` role after onboarding. To test member/admin features:

```sql
-- Promote user to member (for testing booking features)
UPDATE memberships SET role = 'member' 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'test@example.com');

-- Promote user to admin (for testing admin features)
UPDATE memberships SET role = 'admin' 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'admin@example.com');
```

See [Admin Management Guide](docs/ADMIN_MANAGEMENT.md) for complete admin setup instructions.

---

## Deployment

### Mobile App
- **Development**: Expo Go app (scan QR code)
- **Production**: EAS Build for TestFlight (iOS) and Google Play (Android); **command**: `eas build --platform all`
- **This project**: TestFlight was not used (paid Apple Developer account). An **Android preview build** was created instead: [Android preview build on Expo](https://expo.dev/accounts/alinayasmine/projects/the-mom-club/builds/5ce57372-56b0-4b1d-af91-be8386ce2040).

### Backend
- **Database**: Hosted on Supabase (free tier for development, Pro for production)
- **Edge Functions**: Deployed via Supabase CLI
- **Cost**: ~$25/month for Pro tier (recommended for production)

### Monitoring
- **Errors**: Integrate Sentry for crash reporting
- **Analytics**: Integrate Mixpanel or Amplitude for user behavior tracking
- **Performance**: Use Firebase Performance Monitoring

---

## Admin Access

Administrators have elevated privileges for content moderation, event management, and user administration.

**Quick Admin Setup:**
```sql
UPDATE memberships SET role = 'admin', updated_at = NOW()
WHERE user_id = (SELECT id FROM profiles WHERE email = 'admin@example.com');
```

For complete admin management guide, see [docs/ADMIN_MANAGEMENT.md](docs/ADMIN_MANAGEMENT.md):
- How to create admin users
- Admin capabilities and permissions
- Security best practices
- Troubleshooting common issues

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push** to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

### Contribution Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Test on both iOS and Android before submitting

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

See [the-mom-club/README.md](the-mom-club/README.md) for complete license details.

---

## AI Development Disclosure

This project was developed with AI assistance (Claude Sonnet 4.5, ChatGPT, GitHub Copilot, Replit AI):

| Component | AI Assistance | Manual Work |
|-----------|---------------|-------------|
| **Planning** | 30% | 70% |
| **Documentation** | 70% | 30% |
| **Backend (Supabase)** | 80% | 20% |
| **Mobile App (React Native Expo)** | 80% | 20% |
| **Testing & Integration** | 10% | 90% |

**AI was used for:**
- Database schema design and RLS policies
- Boilerplate code generation (screens, components)
- Documentation structure and content
- Edge function scaffolding

**Manual work included:**
- Planning decisions and scope prioritization (70% of planning work)
- Testing and quality assurance (90% of testing work)
- Supabase client configuration
- Authentication flow debugging
- Cross-platform testing (iOS/Android)
- Performance optimizations
- Bug fixes and edge cases
- Code review and refinement (20% of backend and mobile app work)

For detailed AI usage breakdown, see [the-mom-club/README.md](the-mom-club/README.md#ai-tools-disclosure).

---

## Contact & Support

- **Issues**: [Open a GitHub issue](https://github.com/your-org/the-mom-club/issues)
- **Documentation**: See [`docs/`](docs/) folder for comprehensive guides
- **Questions**: Review [the-mom-club/README.md](the-mom-club/README.md) for detailed setup instructions

---

## Acknowledgments

- **Supabase** - For the excellent open-source Firebase alternative
- **Expo** - For making React Native development accessible
- **The Mom Club Community** - For inspiration and feedback
- **Contributors** - Thank you to everyone who helps improve this platform

---

## Roadmap

See [docs/FUTURE_IMPROVEMENTS.md](docs/FUTURE_IMPROVEMENTS.md) for the complete roadmap.

**Week +1 Priorities:**
- Real payment integration (Stripe)
- UI/UX polish and accessibility
- Forum enhancements (likes, nested comments)
- Push notifications
- TestFlight beta testing

**Long-term Vision:**
- Provider marketplace (doulas, lactation consultants)
- Content library (articles, videos, expert Q&A)
- AI-powered health insights
- Multi-language support
- Real-time messaging

---

**Built with care for expecting and new mothers. 💚**

[Get Started](#quick-start) | [Documentation](docs/) | [Contributing](#contributing) | [License](#license)
