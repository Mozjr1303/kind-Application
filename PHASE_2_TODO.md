# Phase 2 API TODO

These endpoints are called by the current frontend but are not implemented in `server/index.js`. They are intentionally not implemented as part of the API security work.

- `GET /api/providers?service=&location=` — search active providers; return only fields appropriate for client discovery.
- `GET /api/users/:id` — fetch one provider profile for an authenticated client without exposing email or phone number.
- `PUT /api/alerts/:id/read` — mark one alert as read (admin only).
- `PUT /api/alerts/read-all` — mark all alerts as read (admin only).
- `DELETE /api/alerts/:id` — delete one alert (admin only).
- `DELETE /api/logs/:id` — delete one log entry (admin only).

The earlier admin dashboard also exposed contact-request deletion. Decide whether that operation is needed; if restored, implement it as an explicit admin-only endpoint with an audit record.
