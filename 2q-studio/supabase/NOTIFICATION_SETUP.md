# Notification worker deployment

The transaction trigger and delivery worker are installed by migration
`0026_transaction_push_pipeline.sql`. Before applying that migration in the
hosted Supabase project, create these Vault secrets in the SQL editor:

```sql
select vault.create_secret(
  'https://your-production-domain.example',
  'notification_worker_url'
);

select vault.create_secret(
  'the-same-value-as-the-vercel-CRON_SECRET',
  'notification_worker_secret'
);
```

The URL must be the deployed application origin, without a path. The worker
secret must exactly match `CRON_SECRET` in the application deployment. The
migration schedules Supabase Cron to call `/api/jobs/notifications` every
minute.

After deployment:

1. Run `supabase/tests/transaction_push_pipeline.sql` against the migrated
   database.
2. Sign in as an active admin and enable notifications from the bell.
3. Create one POS bill and one manual expense while the PWA is backgrounded.
4. Confirm each transaction produces one notification and that tapping it
   opens the bill or transaction page.
