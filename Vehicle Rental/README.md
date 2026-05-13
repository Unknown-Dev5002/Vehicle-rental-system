# DriveHive Vehicle Rental Platform

This implementation follows the approved blueprint and delivers a 15-page, user-centric vehicle rental web experience with reusable UI, core booking/payment flow simulations, CMS-like content pages, reviews, and support ticketing.

## Implemented 15 Pages
1. `index.html` (Home + Special Offers)
2. `listings.html` (Vehicle Listings)
3. `vehicle-details.html` (Vehicle Details + Customer Reviews)
4. `register.html` (User Registration)
5. `login.html` (User Login)
6. `forgot-password.html` (Password Recovery)
7. `booking.html` (Booking)
8. `payment.html` (Payment + Confirmation)
9. `about.html` (About Us)
10. `contact.html` (Contact Us)
11. `faqs.html` (FAQs)
12. `terms.html` (Terms & Conditions)
13. `privacy.html` (Privacy Policy)
14. `blog.html` (Blog)
15. `support.html` (Support + Ticket Submission)

### Page merges used to keep exactly 15
- `Booking Confirmation` is integrated into `payment.html` after successful transaction.
- `Blog Details` is integrated into `blog.html` as a unified content feed.
- `Customer Reviews` and `Special Offers` are integrated into high-conversion pages (`vehicle-details.html`, `index.html`, `listings.html`).

## Core Functional Modules
- **Auth:** registration, login, forgot password with validation and local session handling.
- **Listings:** filter by type/price and sort by price/rating.
- **Vehicle Details:** specs-style summary + user reviews + moderation queue behavior.
- **Booking:** pickup/dropoff/date-time/add-ons and dynamic pricing.
- **Payment:** multi-gateway selection and transaction confirmation receipt.
- **Support:** live chat entry point and ticket submission/status list.

## Shared Components
- Global stylesheet: `assets/css/styles.css`
- Shared client logic: `assets/js/app.js`
- Reusable layout patterns: sticky nav, responsive grid, cards, form blocks, banners.

## Recommended Production Technology Stack

### Frontend
- Next.js (TypeScript)
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- React Query for server state

### Backend
- NestJS (TypeScript)
- JWT + refresh token auth, OAuth2 providers
- Redis + BullMQ for queue/jobs

### Data & Infra
- PostgreSQL
- Redis cache/session/rate-limit
- S3-compatible object storage

### Payments
- Stripe primary
- PayPal secondary
- Gateway abstraction service for maintainability

### Security & Operations
- Cloudflare (WAF, CDN, DDoS)
- Sentry for error tracking
- GitHub Actions CI/CD
- OWASP-aligned security testing in release pipeline

## Security Hardening Included (Current Build)
- Password complexity validation
- Client-side form validation on key flows
- Session state isolation through scoped local storage keys
- Explicit transaction confirmation state and IDs

## Performance Optimizations Included (Current Build)
- Shared CSS/JS assets to reduce duplication
- Lightweight DOM rendering and filtered listing updates
- Mobile-first responsive layout and compact markup

## Run
Open `index.html` in your browser.
