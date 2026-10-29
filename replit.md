# FutureLine

> **Out of date.** The site no longer runs on Replit (see `docs/DEPLOYMENT.md`),
> the FL Tourism page and its images were removed, and every URL is now
> locale-prefixed (`/en/...`, `/ar/...`). The overview below is kept for history.

## Overview
FutureLine is a production-ready full-stack web application for a professional AI, training, and digital services company. Built with Next.js 15 (App Router), TypeScript, TailwindCSS, PostgreSQL, and Prisma ORM.

**Brand**: FutureLine - Design . Deploy . Evolve
**Primary Color**: Deep Navy #0F1E3D
**Accent Gradient**: #1B2C63 to #18A999

## Tech Stack
- **Framework**: Next.js 15.5.12 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS 3 with custom brand theme
- **Database**: PostgreSQL with Prisma ORM (v5.22)
- **Auth**: NextAuth v4 with credentials provider (role-based)
- **Icons**: Lucide React
- **Payments**: Stripe (ready for integration)
- **Email**: Resend (for notifications and CRM emails)

## Project Architecture

```
src/
  app/
    (public)/          # Public-facing pages (Home, Courses, Services, AI)
    (tourism)/tourism/ # FL Tourism standalone page (own layout, no FutureLine header/footer)
    (auth)/            # Login and Register pages
    (protected)/       # Dashboard and Admin portal
    api/               # API routes
      auth/            # NextAuth and registration
      admin/           # Admin CRUD APIs (protected)
      brand/           # Public brand settings API (contact emails)
      ai/              # AI recommendation
      checkout/        # Payment flow
      enrollment/      # Progress tracking
      leads/           # Lead capture API (Tourism, Courses, Services)
  components/          # Reusable components (CourseEnquiryForm, ServiceEnquiryForm, etc.)
    admin/             # Admin-specific components
  lib/                 # Utilities, Prisma client, auth config, brand settings
  types/               # TypeScript type definitions
prisma/
  schema.prisma        # Database schema
  seed.ts              # Seed data script
public/
  images/tourism/      # Tourism gallery + hero images
```

## User Model
- Uses separate `firstName` and `lastName` fields (not a single `name` field)
- Auth session provides computed `name` (firstName + lastName) for backward compatibility

## User Roles
- **ADMIN**: Full system control, access to /admin portal
- **INSTRUCTOR**: Manage assigned courses, upload lessons
- **CUSTOMER**: Browse, purchase, access courses, track progress

## Seed Data Credentials
Local development accounts are created by `prisma/seed.ts` (see that file for
the throwaway dev logins). Never commit real credentials to this repo — it is
public. Production credentials live only in the deployment platform's secrets
manager, and any credential that was ever committed here must be rotated.

## Lead Model
- Uses separate `firstName` and `lastName` fields (not a single `name` field)
- `tourType` field serves as general "interest/topic" across all forms (optional, defaults to "General Enquiry")
- Leads come from multiple sources: FL Tourism, FL Courses, FL Services
- Migration script at `prisma/migrate-leads.ts` handles splitting old `name` data on deployment

## Business Divisions
- **FL Tourism**: Live - Standalone tourism page at /tourism (contact form with firstName/lastName)
- **FL Courses**: Live - Full course catalog, free enrollment, lesson viewer, enquiry form for custom courses
- **FL Services**: Live - Digitalisation service at /services/digitalisation, enquiry form for all services
- **FL AI & Automation**: Hidden (Coming Soon) - Page code preserved at /ai, redirects to home, removed from nav/footer

## Configurable Settings (Admin UI)
- **Brand Settings** (/admin/brand): Company name, tagline, colors, logo, contact emails
  - `contactEmail`: Used on Services, Digitalisation, and AI pages (default: flservices.ai@gmail.com)
  - `tourismEmail`: Used on FL Tourism page (default: authentic.tour.om@gmail.com)
  - Brand utility at `src/lib/brand.ts` with `getBrandSettings()` helper
  - Public API at `/api/brand` serves contact emails (no auth required)

## Key Features
- Public website with hero, four division cards, courses
- Course filtering by type, level, search; all courses are free
- Customer dashboard with progress tracking
- Online course learning area with lesson viewer (video, notes, quizzes)
- Admin portal with full CRUD management
- CRM pipeline with 7 stages, lead detail pages, activity logging
- Email templates with variable substitution
- Automation rules engine (triggers + actions)
- Role-based route protection (Admin, Instructor, Customer)
- Instructor portal with course builder and approval workflow
- CSV export for enrollments and leads
- Bank transfer payment flow (manual admin approval) with PENDING/COMPLETED/FAILED orders
- Instructor Payouts page (/admin/payouts): per-instructor revenue breakdown, commission rate editing, payment logging via InstructorEarning model
- Orders page now shows Instructor column and filter dropdown per instructor
- Users page shows commission rate for instructors with inline editing
- Vimeo unlisted video support: privacy hash extracted from URL (`vimeo.com/ID/HASH`) and appended as `?h=HASH` to embed URL; iframe embed code auto-parsed in lesson forms

## Environment Variables
- DATABASE_URL: PostgreSQL connection string
- NEXTAUTH_SECRET / SESSION_SECRET: Auth session secret
- NEXTAUTH_URL: App URL for NextAuth
- RESEND_API_KEY: Resend email service API key
- RESEND_FROM_EMAIL: Sender address for emails (noreply@futureline.ai)
- APP_URL: Base URL for email links (https://futureline.ai)
- STRIPE_SECRET_KEY: (Optional) Stripe API key

## Running
- Dev: `npm run dev` (port 5000)
- Seed: `npm run seed`
- Build: `npm run build` (Note: Database migrations are removed from the build script to prevent deployment failures. Run `npx prisma db push` manually if schema changes are needed.)
