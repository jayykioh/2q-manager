## Findings

Security audit findings will be recorded here with file references, evidence, risk, and planned remediation.

## Project Map

- App root: `2q-studio`.
- Framework: Next.js `16.2.9`, React `19.2.4`.
- Auth/data: Supabase client/server helpers use public anon key for user-context operations.
- Server secrets: cron routes and maintenance scripts use `SUPABASE_SERVICE_ROLE_KEY`.
- Storage: `/api/upload/presign` issues Cloudflare R2 presigned PUT URLs.
- Security headers: `next.config.ts` sets `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`; no CSP/HSTS/Permissions-Policy yet.
- Middleware/proxy: `proxy.ts` only checks login presence for `/admin`, `/pos`, `/orders`, `/attendance`, `/profile`; admin role enforcement appears dependent on database/RLS and UI checks.

## Confirmed Vulnerabilities

- `app/api/jobs/*/route.ts`: cron authorization compares against ``Bearer ${process.env.CRON_SECRET}`` without first requiring `CRON_SECRET`. If the env var is missing, `Authorization: Bearer undefined` authorizes the request. These routes use `SUPABASE_SERVICE_ROLE_KEY`, so impact is high.
- `app/api/jobs/*/route.ts`: catch blocks return raw `err.message`, which can disclose database/table/internal details to callers.
- `app/api/upload/presign/route.ts`: presign request trusts client-controlled `contentType` and `folder`. Any authenticated user can request PUT URLs for non-image MIME types and arbitrary object key prefixes.
- `supabase/migrations/0002_core_rpcs.sql`: `checkout_order` rejects negative sale prices but permits empty item arrays, zero sale prices, and negative discounts, enabling invalid orders/totals through direct RPC calls.

## Supporting Evidence

- `specs/blueprint.md:608-621` explicitly requires server-side upload auth/role verification, content-type allowlisting, object-prefix allowlisting, and server-generated keys.
- `supabase/migrations/0002_core_rpcs.sql` implements `create_product` with role-based approval but does not validate image object keys/content types.
- `supabase/migrations/0003_ops_rpcs.sql` enforces admin-only `cancel_order` inside the RPC.
- `supabase/migrations/0010_admin_products_rls.sql` adds admin-only product/image write policies.

## Fixed

- Cron routes now require `CRON_SECRET` to be configured and reject missing/mismatched bearer tokens before creating the service-role Supabase client.
- Cron routes now log internal errors server-side and return generic 500 responses.
- Upload presign now allows only image MIME types and the `products` folder, strips leading dots from filenames, caps filename length, rejects empty sanitized names, and uses `randomUUID()` for key entropy.
- Global headers now include HSTS and a restrictive Permissions-Policy.
- Added migration `0011_harden_checkout_order_validation.sql` to reject empty checkout item arrays, negative discounts, and zero/negative sale prices at the database RPC layer.

## Areas Under Review

- R2 upload presign validation: filename/content type/folder controls.
- Cron endpoint authentication and error disclosure.
- Admin route authorization enforcement beyond client-side UI.
- Security headers completeness and compatibility with inline scripts.
- Client-side DOM/script usage in `app/layout.tsx`.

## Non-Issues / Deferred

- Invalid read attempt: `0000_foundation_schema.sql` offset 470 was out of range; will use targeted search/read instead.
