#!/bin/sh
# Sanity-checks a prod Supabase project before flipping PROD_SUPABASE_URL over to it.
# Usage: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... ./scripts/check-prod-supabase.sh

DEV_URL="https://lzftkohidnykwnmekdyq.supabase.co"
URL="${VITE_SUPABASE_URL:?VITE_SUPABASE_URL not set}"
KEY="${VITE_SUPABASE_ANON_KEY:?VITE_SUPABASE_ANON_KEY not set}"
fail=0

if [ "$URL" = "$DEV_URL" ]; then
  echo "FAIL: URL is the dev project ($DEV_URL) — not a real prod cutover"
  fail=1
fi

status=$(curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/" -H "apikey: $KEY")
if [ "$status" = "200" ]; then
  echo "OK: REST endpoint reachable"
else
  echo "FAIL: REST endpoint unreachable (HTTP $status) — check URL/key, or schema not applied yet"
  fail=1
fi

# exercises and workout_sessions both require an authenticated session (see gx-schema.sql
# RLS policies) — an anon key should get an empty array, never a data leak or a table-missing error.
for table in exercises workout_sessions; do
  body=$(curl -s "$URL/rest/v1/$table?select=id" -H "apikey: $KEY" -H "Authorization: Bearer $KEY")
  if [ "$body" = "[]" ]; then
    echo "OK: RLS blocks anonymous reads on $table"
  else
    echo "FAIL: expected [] from anon read on $table, got: $body"
    fail=1
  fi
done

if [ "$fail" = "0" ]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
