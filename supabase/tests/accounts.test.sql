-- LOCAL TEST DATABASE ONLY. Synthetic UUIDs; no passwords, email or patient data.
-- Role impersonation tests Postgres permissions, not Auth token verification.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id)
select ('10000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid
from generate_series(1, 8) n;

insert into public.accounts (user_id, username, role, status, display_name) values
('10000000-0000-0000-0000-000000000001', 'test.admin', 'admin', 'active', 'Test Admin'),
('10000000-0000-0000-0000-000000000002', 'test.staff', 'staff', 'active', 'Test Staff'),
('10000000-0000-0000-0000-000000000003', 'test.locked', 'staff', 'locked', 'Test Locked'),
('10000000-0000-0000-0000-000000000004', 'test.disabled', 'staff', 'deactivated', 'Test Disabled');

select ok((select relrowsecurity from pg_class
  where oid = 'public.accounts'::regclass), 'RLS enabled');
select is(lower(btrim('  Test.Staff  ') collate "C"), 'test.staff',
  'trusted normalization produces canonical username');

select throws_ok(format(
  'insert into public.accounts values (%L, %L, %L, %L, %L)',
  '10000000-0000-0000-0000-000000000005', bad, 'staff', 'active', 'Synthetic'),
  '23514', null, 'reject invalid username: ' || label)
from (values ('Abc', 'uppercase'), ('ab', 'too short'),
  (repeat('a',33), 'too long'), ('a b', 'internal space'),
  (' abc ', 'outer spaces'), (E'abc\n', 'newline'),
  ('ébc', 'Unicode'), ('.abc', 'leading punctuation'),
  ('a@b', 'email syntax')) invalid(bad, label);

select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000005','test.staff','staff','active','Synthetic')$$,
 '23505', null, 'duplicate canonical username denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000005',lower('TEST.STAFF' collate "C"),'staff','active','Synthetic')$$,
 '23505', null, 'normalized case variant denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000005','valid.name','doctor','active','Synthetic')$$,
 '23514', null, 'unknown role denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000005','valid.name','staff','pending','Synthetic')$$,
 '23514', null, 'unknown status denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000005','valid.name',null,'active','Synthetic')$$,
 '23502', null, 'null role denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000005','valid.name','staff',null,'Synthetic')$$,
 '23502', null, 'null status denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000099','valid.name','staff','active','Synthetic')$$,
 '23503', null, 'missing Auth user denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000005','valid.name','staff','active','   ')$$,
 '23514', null, 'blank display name denied');
insert into public.accounts (user_id, username, role, display_name)
 values ('10000000-0000-0000-0000-000000000005', 'a_5-z', 'staff', 'Synthetic');
select is((select status from public.accounts where username='a_5-z'),
 'deactivated', 'new accounts default to deactivated');

-- Anonymous database role has neither read nor write access.
set local role anon;
select throws_ok('select * from public.accounts', '42501', null, 'anon read denied');
select throws_ok($$update public.accounts set status='active'$$,
 '42501', null, 'anon update denied');
select throws_ok($$delete from public.accounts$$, '42501', null, 'anon delete denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000006','anon.user','staff','active','Synthetic')$$,
 '42501', null, 'anon insert denied');
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select is((select count(*)::int from public.accounts),1,'staff sees one account');
select is((select username from public.accounts),'test.staff','staff sees own account');
select is((select count(*)::int from public.accounts where username='test.admin'),
 0,'staff cannot select admin');
select throws_ok($$update public.accounts set role='admin'$$,
 '42501', null, 'self role escalation denied');
select throws_ok($$update public.accounts set status='active'$$,
 '42501', null, 'self status change denied');
select throws_ok($$update public.accounts set username='renamed'$$,
 '42501', null, 'self username change denied');
select throws_ok($$update public.accounts set display_name='Renamed'$$,
 '42501', null, 'self display name change denied');
select throws_ok('delete from public.accounts','42501',null,'authenticated delete denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000006','new.user','staff','active','Synthetic')$$,
 '42501', null, 'authenticated provisioning denied');
select throws_ok($$insert into public.accounts values
 ('10000000-0000-0000-0000-000000000002','test.staff','admin','active','Synthetic')
 on conflict (user_id) do update set role=excluded.role$$,
 '42501', null, 'upsert escalation denied');
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select is((select username from public.accounts),'test.admin','admin sees only own account');
select throws_ok($$update public.accounts set status='active'$$,
 '42501', null, 'application admin still cannot directly administer accounts');
reset role;

-- Test-only protected resource: demonstrates the REQUIRED future policy pattern.
-- This table and policy never enter migrations or touch clinic storage.
create table public.accounts_test_probe (id integer primary key);
insert into public.accounts_test_probe values (1);
alter table public.accounts_test_probe enable row level security;
grant select, insert on public.accounts_test_probe to authenticated;
create policy active_account_only on public.accounts_test_probe
 for all to authenticated
 using (exists (select 1 from public.accounts a
   where a.user_id=(select auth.uid()) and a.status='active'))
 with check (exists (select 1 from public.accounts a
   where a.user_id=(select auth.uid()) and a.status='active'));

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select is((select count(*)::int from public.accounts_test_probe),1,'active resource read permitted');
reset role;
update public.accounts set status='locked'
 where user_id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
select is((select count(*)::int from public.accounts_test_probe),0,'same identity denied after lock');
select throws_ok('insert into public.accounts_test_probe values (2)',
 '42501',null,'locked resource insert denied');
select is((select status from public.accounts),'locked','locked user may read own status');
reset role;
update public.accounts set status='deactivated'
 where user_id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
select is((select count(*)::int from public.accounts_test_probe),0,'same identity denied after deactivation');
select throws_ok('insert into public.accounts_test_probe values (2)',
 '42501',null,'deactivated resource insert denied');
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000008',true);
set local role authenticated;
select is((select count(*)::int from public.accounts),0,'missing account sees no account rows');
select is((select count(*)::int from public.accounts_test_probe),0,'missing account denied resource');
reset role;

set local role service_role;
select lives_ok($$update public.accounts set display_name='Trusted change'
 where user_id='10000000-0000-0000-0000-000000000002'$$,'trusted service update allowed');
reset role;
delete from auth.users where id='10000000-0000-0000-0000-000000000005';
select is((select count(*)::int from public.accounts where username='a_5-z'),0,'Auth deletion cascades');

select * from finish();
rollback;
