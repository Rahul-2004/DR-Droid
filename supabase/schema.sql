-- Run after Prisma migrations if you want defense-in-depth RLS for direct Supabase access.
-- The application itself accesses these tables only from the server through Prisma.
create extension if not exists pgcrypto;

alter table "User" enable row level security;
alter table "CreditAccount" enable row level security;
alter table "CreditTransaction" enable row level security;
alter table "ProviderKey" enable row level security;
alter table "Conversation" enable row level security;
alter table "Message" enable row level security;
alter table "ToolCall" enable row level security;
alter table "UsageRecord" enable row level security;
alter table "Report" enable row level security;
alter table "Payment" enable row level security;
alter table "ResearchCache" enable row level security;
alter table "ApiRateLimit" enable row level security;

drop policy if exists "users read own profile" on "User";
drop policy if exists "users read own credit account" on "CreditAccount";
drop policy if exists "users read own provider keys" on "ProviderKey";
drop policy if exists "users read own conversations" on "Conversation";
drop policy if exists "users read own usage" on "UsageRecord";
drop policy if exists "users read own reports" on "Report";
drop policy if exists "users read own payments" on "Payment";

create policy "users read own profile" on "User" for select using (id = auth.uid());
create policy "users read own credit account" on "CreditAccount" for select using ("userId" = auth.uid());
create policy "users read own provider keys" on "ProviderKey" for select using ("userId" = auth.uid());
create policy "users read own conversations" on "Conversation" for select using ("userId" = auth.uid());
create policy "users read own usage" on "UsageRecord" for select using ("userId" = auth.uid());
create policy "users read own reports" on "Report" for select using ("userId" = auth.uid());
create policy "users read own payments" on "Payment" for select using ("userId" = auth.uid());

-- No browser policies are created for encrypted keys, messages, tool calls, caches, ledgers,
-- or rate-limit state. The server owns all writes and checks resource ownership first.
