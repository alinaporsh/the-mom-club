# The Mom Club — Product Brief (MVP)

## Core user & problem

**User:** Expecting and recently postpartum mothers who lack a dedicated, supportive community during pregnancy and early parenthood.

**Problem:** Isolation and lack of access to a trusted village—other moms, evidence-based content, and simple ways to join classes or events—without leaving home or wading through generic forums.

## What is included in the MVP

- **Authentication:** Email / OTP sign-up and sign-in; optional "Continue as Guest" with limited access.
- **Onboarding:** One-screen flow: status (Pregnant / New Mom), due date or baby age, name. Completion creates profile and assigns default (free) membership.
- **Free vs member access:** Role-based access (guest, free, member, admin). Free users can read forum and events, post and comment, and book individual classes for a per-class fee (mock payment). Members can post, comment, and book all classes without additional per-class fees.
- **Community forum:** Read posts; create new posts (member-only). Post detail view (comments optional in scope).
- **Events / classes:** List events with title, date, instructor, location, and per-class price; event detail with "Book" button. For free members, booking flows through a mock payment window per class; for paid members, booking is included (no extra per-class payment).
- **Profile:** View profile and membership role; simple edit (e.g. name). Upgrade message for free users.
- **Content discovery:** Home screen with content cards (Forum, Workshops and Classes) for discovery.

## What is explicitly excluded

- Real payments and subscriptions (booking, member status, and per-class payments are mocked or manually set).
- AI-driven health insights, mood tracking, and personalized health recommendations.
- Full provider marketplace or external integrations.
- TestFlight / production app-store build in the 1-day MVP window.
- Comments and likes on forum posts (optional; included only if time allows).

## Key assumptions & risks

- **Assumptions:** Supabase is available; users are primarily pregnant or postpartum; privacy and safety are valued; speed of delivery outweighs pixel-perfect UI.
- **Risks:** Integration issues between Expo and Supabase; Replit/build delays. Mitigation: start with auth and onboarding, then add forum and events; mock booking and membership where needed.
