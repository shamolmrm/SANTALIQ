# Error monitoring

It is self-hosted and needs no external service.

- **Server errors:** any unhandled API exception is grouped by fingerprint (type, message and route) into the `error_events` table, with the traceback. The visitor gets a generic 500 message that leaks no details.
- **Browser errors:** these are uncaught errors, promise rejections and React error boundaries (`app/error.tsx`, `app/global-error.tsx`). They go to `POST /api/v1/telemetry/client-error`, which is rate-limited to 20 per minute per IP and stores only the page path, never the query string.
- **CSP reports:** `POST /api/v1/telemetry/csp` receives Content-Security-Policy violation reports.
- **Alerts:** a new or reopened error is emailed to `ALERT_EMAIL`, or to `CONTACT_NOTIFY_EMAIL` if that is not set. A repeat of the same error is emailed at most once an hour. Email must be enabled. Set both in the server `.env`.
- **Admin:** `/admin/system` has an **Errors** card with Open and Resolved tabs, counts, the last time each was seen, and the trace. The System menu item shows how many errors are open.
