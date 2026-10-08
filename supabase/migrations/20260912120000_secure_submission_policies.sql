-- Public submissions go through validated server functions using the server client.
-- Prevent direct REST inserts from forging identity, offers, status or other fields.
begin;
drop policy if exists contact_insert on public.contact_messages;
drop policy if exists buy_swap_owner_insert on public.buy_swap_requests;
drop policy if exists support_owner_insert on public.support_requests;
-- Existing admin policies and owner SELECT policies remain intact.
revoke insert on public.contact_messages, public.buy_swap_requests, public.support_requests from anon;
commit;

