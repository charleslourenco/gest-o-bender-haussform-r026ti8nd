-- Make the email column on public.leads nullable so leads can be created
-- without an email address (quick registration of potential customers).
--
-- `ALTER COLUMN ... DROP NOT NULL` is safe to re-run: dropping a NOT NULL
-- constraint that no longer exists is a no-op and does not error, so this
-- migration remains idempotent.

ALTER TABLE public.leads
  ALTER COLUMN email DROP NOT NULL;
