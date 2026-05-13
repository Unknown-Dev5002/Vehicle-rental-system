# Security and Performance Hardening Checklist

## Security
- Enforce HTTPS and HSTS at CDN/edge.
- Apply CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers.
- Add server-side input validation and output encoding for all user-submitted fields.
- Integrate rate limiting for `/auth/*`, `/bookings`, `/payments/*`.
- Implement server-side session/token rotation and revocation.
- Use webhook signature validation for payment confirmations.
- Keep audit logs for login, booking status changes, refunds, and moderation actions.

## Compliance
- Add cookie consent manager and policy links in footer.
- Provide account data export and deletion workflow.
- Maintain explicit retention policy for support tickets and transaction records.

## Performance
- Serve assets through CDN and cache static resources aggressively.
- Use image optimization and lazy loading for fleet images.
- Add API caching for list endpoints with short TTL.
- Add DB indexes for `vehicle availability`, `booking status`, and `payment transactionId`.
- Track P95 latency and error rates in monitoring dashboards.

## Observability
- Enable Sentry for frontend/backend exceptions.
- Add health check endpoints (`/health`, `/ready`).
- Create alerts for payment webhook failures and booking creation errors.
