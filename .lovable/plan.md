# Priority-1 Production Features Plan

This is a large scope (6 features + DB hardening). I'll ship it in one coherent pass, layered on top of existing auth/realtime/suggestions/messages flows — none of those are touched.

## 1. Database (single migration)

New tables (all with RLS + GRANTs + updated_at where relevant):

- `tailor_profiles` — 1:1 with tailor `auth.users`. Fields: profile_photo, studio_name, owner_name, experience_years, specialization, location, phone, phone_visibility (bool), bio. Public SELECT (anyone signed in can view); owner-only UPDATE/INSERT.
- `reviews` — user_id, tailor_id, request_id (unique), rating 1–5 (trigger validated), review_text. Public SELECT; INSERT only by user who owns a completed request matching that tailor.
- `saved_tailors` — (user_id, tailor_id) unique. Owner-only SELECT/INSERT/DELETE. Tailors cannot read.
- `portfolio_items` — tailor_id, before_image, after_image, title, description. Public SELECT; owner-only write.
- `completed_projects` — request_id (unique), tailor_id, user_id, completion_date. Inserted by trigger when both parties confirm.

Extend existing tables:

- `saree_uploads`: add `status` enum (`open`, `in_progress`, `completed`), `assigned_tailor_id`, `user_confirmed_completion`, `tailor_marked_completed`. Default `open`.
- Add indexes on all FKs and common filters (tailor_id, user_id, status).

Storage: reuse existing `sarees` bucket for profile/portfolio images under `profiles/` and `portfolio/` prefixes.

## 2. Routes (new)

- `/dashboard/tailor/profile/edit` — edit studio profile, upload photo
- `/dashboard/tailor/portfolio` — manage portfolio (add before/after entries)
- `/dashboard/tailor/completed` — completed projects list (replaces hash anchor)
- `/dashboard/tailor/reviews` — live reviews list
- `/dashboard/user/tailors/$tailorId` — public tailor profile (photo, bio, rating, portfolio, reviews)
- `/dashboard/user/saved` — saved tailors list
- `/dashboard/user/completed` — user's completed transformations

All use the `_` suffix convention to stay outside the dashboard parent's Outlet, matching existing pattern.

## 3. UI extensions (no existing flows changed)

- **Suggestion card (user side)**: add "Select this tailor" button → sets `saree_uploads.status = 'in_progress'`, `assigned_tailor_id`.
- **Tailor request feed**: assigned requests get an "In Progress" tab + "Mark Completed" button.
- **User dashboard request list**: status badge (Open / In Progress / Completed) + "Confirm completion" when tailor has marked done + "Leave review" once completed.
- **Save tailor**: heart button on tailor cards + on profile page.
- **Suggestion rows now link to `/dashboard/user/tailors/$tailorId`** instead of static demo data (live Supabase suggestions only — existing demo list stays as fallback inspiration).

## 4. Quality

- All Supabase calls wrapped with try/catch + sonner toasts.
- Loading skeletons via existing `Skeleton` component.
- Empty states for every list.
- Realtime not added to new tables (out of scope — feature 1-6 spec doesn't require it), but tables enabled for it later.

## Files

New: 1 migration, 7 route files, 1 `TailorProfileCard.tsx` shared component.
Edited: `AppShell.tsx` (sidebar links), `dashboard.user.tsx` (status badges + select/confirm/review actions), `dashboard.tailor.tsx` (in-progress + mark complete), `routeTree.gen.ts`.

Unchanged: login, register, session, suggestions creation, messages, notifications, upload flow.

Confirm and I'll execute — starting with the migration (which needs your approval before running).