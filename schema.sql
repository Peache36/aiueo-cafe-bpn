-- AIUEO Cafe: skema database (dibuat otomatis dari kode). Aman dijalankan berulang kali.
-- Jalankan di Supabase: SQL Editor > New query > tempel seluruh isi > Run.

create table if not exists public.aiueo_users (rn bigint generated always as identity primary key);
alter table public.aiueo_users add column if not exists "user_id" text not null default '';
alter table public.aiueo_users add column if not exists "phone" text not null default '';
alter table public.aiueo_users add column if not exists "name" text not null default '';
alter table public.aiueo_users add column if not exists "email" text not null default '';
alter table public.aiueo_users add column if not exists "role" text not null default '';
alter table public.aiueo_users add column if not exists "member_code" text not null default '';
alter table public.aiueo_users add column if not exists "stamps" text not null default '';
alter table public.aiueo_users add column if not exists "total_earned" text not null default '';
alter table public.aiueo_users add column if not exists "total_redeemed" text not null default '';
alter table public.aiueo_users add column if not exists "active" text not null default '';
alter table public.aiueo_users add column if not exists "created_at" text not null default '';
alter table public.aiueo_users add column if not exists "last_login" text not null default '';
alter table public.aiueo_users add column if not exists "last_stamp_at" text not null default '';
alter table public.aiueo_users add column if not exists "claimed_ids" text not null default '';
alter table public.aiueo_users add column if not exists "username" text not null default '';
alter table public.aiueo_users add column if not exists "username_key" text not null default '';
alter table public.aiueo_users add column if not exists "gender" text not null default '';
alter table public.aiueo_users add column if not exists "vp_total" text not null default '';
alter table public.aiueo_users add column if not exists "vp_month" text not null default '';
alter table public.aiueo_users add column if not exists "vp_month_key" text not null default '';
alter table public.aiueo_users add column if not exists "grp_change_key" text not null default '';
alter table public.aiueo_users add column if not exists "grp_change_ts" text not null default '';
alter table public.aiueo_users add column if not exists "auto_created" text not null default '';
create index if not exists ix_aiueo_users_user_id on public.aiueo_users ("user_id");
create index if not exists ix_aiueo_users_phone on public.aiueo_users ("phone");
create index if not exists ix_aiueo_users_member_code on public.aiueo_users ("member_code");
create index if not exists ix_aiueo_users_username_key on public.aiueo_users ("username_key");
alter table public.aiueo_users enable row level security;
revoke all on public.aiueo_users from anon, authenticated;

create table if not exists public.aiueo_stamps (rn bigint generated always as identity primary key);
alter table public.aiueo_stamps add column if not exists "id" text not null default '';
alter table public.aiueo_stamps add column if not exists "user_id" text not null default '';
alter table public.aiueo_stamps add column if not exists "customer_name" text not null default '';
alter table public.aiueo_stamps add column if not exists "qty" text not null default '';
alter table public.aiueo_stamps add column if not exists "type" text not null default '';
alter table public.aiueo_stamps add column if not exists "by_user" text not null default '';
alter table public.aiueo_stamps add column if not exists "by_name" text not null default '';
alter table public.aiueo_stamps add column if not exists "note" text not null default '';
alter table public.aiueo_stamps add column if not exists "ts" text not null default '';
alter table public.aiueo_stamps add column if not exists "stamp_type" text not null default '';
alter table public.aiueo_stamps add column if not exists "card_id" text not null default '';
alter table public.aiueo_stamps add column if not exists "void_of" text not null default '';
create index if not exists ix_aiueo_stamps_id on public.aiueo_stamps ("id");
create index if not exists ix_aiueo_stamps_user_id on public.aiueo_stamps ("user_id");
create index if not exists ix_aiueo_stamps_ts on public.aiueo_stamps ("ts");
create index if not exists ix_aiueo_stamps_card_id on public.aiueo_stamps ("card_id");
alter table public.aiueo_stamps enable row level security;
revoke all on public.aiueo_stamps from anon, authenticated;

create table if not exists public.aiueo_adminlog (rn bigint generated always as identity primary key);
alter table public.aiueo_adminlog add column if not exists "id" text not null default '';
alter table public.aiueo_adminlog add column if not exists "ts" text not null default '';
alter table public.aiueo_adminlog add column if not exists "by_user" text not null default '';
alter table public.aiueo_adminlog add column if not exists "by_name" text not null default '';
alter table public.aiueo_adminlog add column if not exists "action" text not null default '';
alter table public.aiueo_adminlog add column if not exists "detail" text not null default '';
create index if not exists ix_aiueo_adminlog_id on public.aiueo_adminlog ("id");
create index if not exists ix_aiueo_adminlog_ts on public.aiueo_adminlog ("ts");
alter table public.aiueo_adminlog enable row level security;
revoke all on public.aiueo_adminlog from anon, authenticated;

create table if not exists public.aiueo_backups (rn bigint generated always as identity primary key);
alter table public.aiueo_backups add column if not exists "id" text not null default '';
alter table public.aiueo_backups add column if not exists "ts" text not null default '';
alter table public.aiueo_backups add column if not exists "table_name" text not null default '';
alter table public.aiueo_backups add column if not exists "n_rows" text not null default '';
alter table public.aiueo_backups add column if not exists "csv" text not null default '';
create index if not exists ix_aiueo_backups_id on public.aiueo_backups ("id");
create index if not exists ix_aiueo_backups_ts on public.aiueo_backups ("ts");
alter table public.aiueo_backups enable row level security;
revoke all on public.aiueo_backups from anon, authenticated;

create table if not exists public.aiueo_redemptions (rn bigint generated always as identity primary key);
alter table public.aiueo_redemptions add column if not exists "id" text not null default '';
alter table public.aiueo_redemptions add column if not exists "user_id" text not null default '';
alter table public.aiueo_redemptions add column if not exists "customer_name" text not null default '';
alter table public.aiueo_redemptions add column if not exists "reward_name" text not null default '';
alter table public.aiueo_redemptions add column if not exists "stamps_used" text not null default '';
alter table public.aiueo_redemptions add column if not exists "by_user" text not null default '';
alter table public.aiueo_redemptions add column if not exists "by_name" text not null default '';
alter table public.aiueo_redemptions add column if not exists "ts" text not null default '';
alter table public.aiueo_redemptions add column if not exists "reward_id" text not null default '';
alter table public.aiueo_redemptions add column if not exists "stamp_type" text not null default '';
alter table public.aiueo_redemptions add column if not exists "card_id" text not null default '';
create index if not exists ix_aiueo_redemptions_id on public.aiueo_redemptions ("id");
create index if not exists ix_aiueo_redemptions_user_id on public.aiueo_redemptions ("user_id");
create index if not exists ix_aiueo_redemptions_ts on public.aiueo_redemptions ("ts");
create index if not exists ix_aiueo_redemptions_card_id on public.aiueo_redemptions ("card_id");
alter table public.aiueo_redemptions enable row level security;
revoke all on public.aiueo_redemptions from anon, authenticated;

create table if not exists public.aiueo_rewards (rn bigint generated always as identity primary key);
alter table public.aiueo_rewards add column if not exists "id" text not null default '';
alter table public.aiueo_rewards add column if not exists "name" text not null default '';
alter table public.aiueo_rewards add column if not exists "description" text not null default '';
alter table public.aiueo_rewards add column if not exists "stamps_required" text not null default '';
alter table public.aiueo_rewards add column if not exists "stamp_type" text not null default '';
alter table public.aiueo_rewards add column if not exists "active" text not null default '';
alter table public.aiueo_rewards add column if not exists "sort" text not null default '';
alter table public.aiueo_rewards add column if not exists "created_at" text not null default '';
create index if not exists ix_aiueo_rewards_id on public.aiueo_rewards ("id");
alter table public.aiueo_rewards enable row level security;
revoke all on public.aiueo_rewards from anon, authenticated;

create table if not exists public.aiueo_campaigns (rn bigint generated always as identity primary key);
alter table public.aiueo_campaigns add column if not exists "id" text not null default '';
alter table public.aiueo_campaigns add column if not exists "name" text not null default '';
alter table public.aiueo_campaigns add column if not exists "description" text not null default '';
alter table public.aiueo_campaigns add column if not exists "icon" text not null default '';
alter table public.aiueo_campaigns add column if not exists "start" text not null default '';
alter table public.aiueo_campaigns add column if not exists "end" text not null default '';
alter table public.aiueo_campaigns add column if not exists "redeem_until" text not null default '';
alter table public.aiueo_campaigns add column if not exists "active" text not null default '';
alter table public.aiueo_campaigns add column if not exists "sort" text not null default '';
alter table public.aiueo_campaigns add column if not exists "created_at" text not null default '';
create index if not exists ix_aiueo_campaigns_id on public.aiueo_campaigns ("id");
alter table public.aiueo_campaigns enable row level security;
revoke all on public.aiueo_campaigns from anon, authenticated;

create table if not exists public.aiueo_cards (rn bigint generated always as identity primary key);
alter table public.aiueo_cards add column if not exists "card_id" text not null default '';
alter table public.aiueo_cards add column if not exists "user_id" text not null default '';
alter table public.aiueo_cards add column if not exists "campaign_id" text not null default '';
alter table public.aiueo_cards add column if not exists "stamps" text not null default '';
alter table public.aiueo_cards add column if not exists "claimed_ids" text not null default '';
alter table public.aiueo_cards add column if not exists "status" text not null default '';
alter table public.aiueo_cards add column if not exists "created_at" text not null default '';
alter table public.aiueo_cards add column if not exists "completed_at" text not null default '';
create index if not exists ix_aiueo_cards_card_id on public.aiueo_cards ("card_id");
create index if not exists ix_aiueo_cards_user_id on public.aiueo_cards ("user_id");
create index if not exists ix_aiueo_cards_status on public.aiueo_cards ("status");
alter table public.aiueo_cards enable row level security;
revoke all on public.aiueo_cards from anon, authenticated;

create table if not exists public.aiueo_events (rn bigint generated always as identity primary key);
alter table public.aiueo_events add column if not exists "id" text not null default '';
alter table public.aiueo_events add column if not exists "title" text not null default '';
alter table public.aiueo_events add column if not exists "subtitle" text not null default '';
alter table public.aiueo_events add column if not exists "badge" text not null default '';
alter table public.aiueo_events add column if not exists "image_url" text not null default '';
alter table public.aiueo_events add column if not exists "link" text not null default '';
alter table public.aiueo_events add column if not exists "start" text not null default '';
alter table public.aiueo_events add column if not exists "end" text not null default '';
alter table public.aiueo_events add column if not exists "active" text not null default '';
alter table public.aiueo_events add column if not exists "sort" text not null default '';
alter table public.aiueo_events add column if not exists "created_at" text not null default '';
create index if not exists ix_aiueo_events_id on public.aiueo_events ("id");
alter table public.aiueo_events enable row level security;
revoke all on public.aiueo_events from anon, authenticated;

create table if not exists public.aiueo_sessions (rn bigint generated always as identity primary key);
alter table public.aiueo_sessions add column if not exists "token_hash" text not null default '';
alter table public.aiueo_sessions add column if not exists "user_id" text not null default '';
alter table public.aiueo_sessions add column if not exists "expires" text not null default '';
alter table public.aiueo_sessions add column if not exists "remember" text not null default '';
alter table public.aiueo_sessions add column if not exists "device" text not null default '';
alter table public.aiueo_sessions add column if not exists "created_at" text not null default '';
create index if not exists ix_aiueo_sessions_token_hash on public.aiueo_sessions ("token_hash");
create index if not exists ix_aiueo_sessions_user_id on public.aiueo_sessions ("user_id");
alter table public.aiueo_sessions enable row level security;
revoke all on public.aiueo_sessions from anon, authenticated;

create table if not exists public.aiueo_settings (rn bigint generated always as identity primary key);
alter table public.aiueo_settings add column if not exists "key" text not null default '';
alter table public.aiueo_settings add column if not exists "value" text not null default '';
alter table public.aiueo_settings add column if not exists "description" text not null default '';
create index if not exists ix_aiueo_settings_key on public.aiueo_settings ("key");
alter table public.aiueo_settings enable row level security;
revoke all on public.aiueo_settings from anon, authenticated;

create table if not exists public.aiueo_games (rn bigint generated always as identity primary key);
alter table public.aiueo_games add column if not exists "id" text not null default '';
alter table public.aiueo_games add column if not exists "name" text not null default '';
alter table public.aiueo_games add column if not exists "image_url" text not null default '';
alter table public.aiueo_games add column if not exists "min_players" text not null default '';
alter table public.aiueo_games add column if not exists "max_players" text not null default '';
alter table public.aiueo_games add column if not exists "level" text not null default '';
alter table public.aiueo_games add column if not exists "duration" text not null default '';
alter table public.aiueo_games add column if not exists "mechanics" text not null default '';
alter table public.aiueo_games add column if not exists "description" text not null default '';
alter table public.aiueo_games add column if not exists "active" text not null default '';
alter table public.aiueo_games add column if not exists "play_count" text not null default '';
alter table public.aiueo_games add column if not exists "last_played" text not null default '';
alter table public.aiueo_games add column if not exists "created_at" text not null default '';
create index if not exists ix_aiueo_games_id on public.aiueo_games ("id");
alter table public.aiueo_games enable row level security;
revoke all on public.aiueo_games from anon, authenticated;

create table if not exists public.aiueo_tiers (rn bigint generated always as identity primary key);
alter table public.aiueo_tiers add column if not exists "id" text not null default '';
alter table public.aiueo_tiers add column if not exists "name" text not null default '';
alter table public.aiueo_tiers add column if not exists "min_vp" text not null default '';
alter table public.aiueo_tiers add column if not exists "benefit" text not null default '';
alter table public.aiueo_tiers add column if not exists "color" text not null default '';
alter table public.aiueo_tiers add column if not exists "active" text not null default '';
alter table public.aiueo_tiers add column if not exists "sort" text not null default '';
alter table public.aiueo_tiers add column if not exists "created_at" text not null default '';
create index if not exists ix_aiueo_tiers_id on public.aiueo_tiers ("id");
alter table public.aiueo_tiers enable row level security;
revoke all on public.aiueo_tiers from anon, authenticated;

create table if not exists public.aiueo_pointsledger (rn bigint generated always as identity primary key);
alter table public.aiueo_pointsledger add column if not exists "id" text not null default '';
alter table public.aiueo_pointsledger add column if not exists "user_id" text not null default '';
alter table public.aiueo_pointsledger add column if not exists "username" text not null default '';
alter table public.aiueo_pointsledger add column if not exists "amount" text not null default '';
alter table public.aiueo_pointsledger add column if not exists "source" text not null default '';
alter table public.aiueo_pointsledger add column if not exists "ref" text not null default '';
alter table public.aiueo_pointsledger add column if not exists "note" text not null default '';
alter table public.aiueo_pointsledger add column if not exists "by_user" text not null default '';
alter table public.aiueo_pointsledger add column if not exists "by_name" text not null default '';
alter table public.aiueo_pointsledger add column if not exists "ts" text not null default '';
create index if not exists ix_aiueo_pointsledger_id on public.aiueo_pointsledger ("id");
create index if not exists ix_aiueo_pointsledger_user_id on public.aiueo_pointsledger ("user_id");
create index if not exists ix_aiueo_pointsledger_ts on public.aiueo_pointsledger ("ts");
alter table public.aiueo_pointsledger enable row level security;
revoke all on public.aiueo_pointsledger from anon, authenticated;

create table if not exists public.aiueo_groups (rn bigint generated always as identity primary key);
alter table public.aiueo_groups add column if not exists "id" text not null default '';
alter table public.aiueo_groups add column if not exists "name" text not null default '';
alter table public.aiueo_groups add column if not exists "leader_id" text not null default '';
alter table public.aiueo_groups add column if not exists "status" text not null default '';
alter table public.aiueo_groups add column if not exists "first_done" text not null default '';
alter table public.aiueo_groups add column if not exists "waiting_since" text not null default '';
alter table public.aiueo_groups add column if not exists "created_at" text not null default '';
alter table public.aiueo_groups add column if not exists "rename_key" text not null default '';
alter table public.aiueo_groups add column if not exists "rename_ts" text not null default '';
create index if not exists ix_aiueo_groups_id on public.aiueo_groups ("id");
create index if not exists ix_aiueo_groups_status on public.aiueo_groups ("status");
alter table public.aiueo_groups enable row level security;
revoke all on public.aiueo_groups from anon, authenticated;

create table if not exists public.aiueo_groupmembers (rn bigint generated always as identity primary key);
alter table public.aiueo_groupmembers add column if not exists "id" text not null default '';
alter table public.aiueo_groupmembers add column if not exists "group_id" text not null default '';
alter table public.aiueo_groupmembers add column if not exists "user_id" text not null default '';
alter table public.aiueo_groupmembers add column if not exists "kid_id" text not null default '';
alter table public.aiueo_groupmembers add column if not exists "status" text not null default '';
alter table public.aiueo_groupmembers add column if not exists "invited_by" text not null default '';
alter table public.aiueo_groupmembers add column if not exists "joined_at" text not null default '';
alter table public.aiueo_groupmembers add column if not exists "left_at" text not null default '';
create index if not exists ix_aiueo_groupmembers_id on public.aiueo_groupmembers ("id");
create index if not exists ix_aiueo_groupmembers_group_id on public.aiueo_groupmembers ("group_id");
create index if not exists ix_aiueo_groupmembers_user_id on public.aiueo_groupmembers ("user_id");
create index if not exists ix_aiueo_groupmembers_status on public.aiueo_groupmembers ("status");
alter table public.aiueo_groupmembers enable row level security;
revoke all on public.aiueo_groupmembers from anon, authenticated;

create table if not exists public.aiueo_kids (rn bigint generated always as identity primary key);
alter table public.aiueo_kids add column if not exists "id" text not null default '';
alter table public.aiueo_kids add column if not exists "name" text not null default '';
alter table public.aiueo_kids add column if not exists "guardian_id" text not null default '';
alter table public.aiueo_kids add column if not exists "active" text not null default '';
alter table public.aiueo_kids add column if not exists "created_at" text not null default '';
create index if not exists ix_aiueo_kids_id on public.aiueo_kids ("id");
alter table public.aiueo_kids enable row level security;
revoke all on public.aiueo_kids from anon, authenticated;

create table if not exists public.aiueo_visits (rn bigint generated always as identity primary key);
alter table public.aiueo_visits add column if not exists "id" text not null default '';
alter table public.aiueo_visits add column if not exists "date" text not null default '';
alter table public.aiueo_visits add column if not exists "ts" text not null default '';
alter table public.aiueo_visits add column if not exists "user_id" text not null default '';
alter table public.aiueo_visits add column if not exists "kid_id" text not null default '';
alter table public.aiueo_visits add column if not exists "type" text not null default '';
alter table public.aiueo_visits add column if not exists "hours" text not null default '';
alter table public.aiueo_visits add column if not exists "group_id" text not null default '';
alter table public.aiueo_visits add column if not exists "by_user" text not null default '';
alter table public.aiueo_visits add column if not exists "by_name" text not null default '';
alter table public.aiueo_visits add column if not exists "stamp" text not null default '';
alter table public.aiueo_visits add column if not exists "vp" text not null default '';
create index if not exists ix_aiueo_visits_id on public.aiueo_visits ("id");
create index if not exists ix_aiueo_visits_ts on public.aiueo_visits ("ts");
create index if not exists ix_aiueo_visits_user_id on public.aiueo_visits ("user_id");
create index if not exists ix_aiueo_visits_group_id on public.aiueo_visits ("group_id");
alter table public.aiueo_visits enable row level security;
revoke all on public.aiueo_visits from anon, authenticated;

create table if not exists public.aiueo_visitgames (rn bigint generated always as identity primary key);
alter table public.aiueo_visitgames add column if not exists "id" text not null default '';
alter table public.aiueo_visitgames add column if not exists "game_id" text not null default '';
alter table public.aiueo_visitgames add column if not exists "game_name" text not null default '';
alter table public.aiueo_visitgames add column if not exists "players" text not null default '';
alter table public.aiueo_visitgames add column if not exists "group_id" text not null default '';
alter table public.aiueo_visitgames add column if not exists "by_user" text not null default '';
alter table public.aiueo_visitgames add column if not exists "by_name" text not null default '';
alter table public.aiueo_visitgames add column if not exists "ts" text not null default '';
create index if not exists ix_aiueo_visitgames_id on public.aiueo_visitgames ("id");
create index if not exists ix_aiueo_visitgames_group_id on public.aiueo_visitgames ("group_id");
create index if not exists ix_aiueo_visitgames_ts on public.aiueo_visitgames ("ts");
alter table public.aiueo_visitgames enable row level security;
revoke all on public.aiueo_visitgames from anon, authenticated;

create table if not exists public.aiueo_activities (rn bigint generated always as identity primary key);
alter table public.aiueo_activities add column if not exists "id" text not null default '';
alter table public.aiueo_activities add column if not exists "kind" text not null default '';
alter table public.aiueo_activities add column if not exists "title" text not null default '';
alter table public.aiueo_activities add column if not exists "description" text not null default '';
alter table public.aiueo_activities add column if not exists "start" text not null default '';
alter table public.aiueo_activities add column if not exists "vp" text not null default '';
alter table public.aiueo_activities add column if not exists "gm_id" text not null default '';
alter table public.aiueo_activities add column if not exists "status" text not null default '';
alter table public.aiueo_activities add column if not exists "active" text not null default '';
alter table public.aiueo_activities add column if not exists "created_at" text not null default '';
create index if not exists ix_aiueo_activities_id on public.aiueo_activities ("id");
create index if not exists ix_aiueo_activities_status on public.aiueo_activities ("status");
alter table public.aiueo_activities enable row level security;
revoke all on public.aiueo_activities from anon, authenticated;

create table if not exists public.aiueo_actreg (rn bigint generated always as identity primary key);
alter table public.aiueo_actreg add column if not exists "id" text not null default '';
alter table public.aiueo_actreg add column if not exists "activity_id" text not null default '';
alter table public.aiueo_actreg add column if not exists "user_id" text not null default '';
alter table public.aiueo_actreg add column if not exists "status" text not null default '';
alter table public.aiueo_actreg add column if not exists "placement" text not null default '';
alter table public.aiueo_actreg add column if not exists "ts" text not null default '';
create index if not exists ix_aiueo_actreg_id on public.aiueo_actreg ("id");
create index if not exists ix_aiueo_actreg_activity_id on public.aiueo_actreg ("activity_id");
create index if not exists ix_aiueo_actreg_user_id on public.aiueo_actreg ("user_id");
create index if not exists ix_aiueo_actreg_status on public.aiueo_actreg ("status");
create index if not exists ix_aiueo_actreg_ts on public.aiueo_actreg ("ts");
alter table public.aiueo_actreg enable row level security;
revoke all on public.aiueo_actreg from anon, authenticated;

create table if not exists public.aiueo_badges (rn bigint generated always as identity primary key);
alter table public.aiueo_badges add column if not exists "id" text not null default '';
alter table public.aiueo_badges add column if not exists "code" text not null default '';
alter table public.aiueo_badges add column if not exists "name" text not null default '';
alter table public.aiueo_badges add column if not exists "icon" text not null default '';
alter table public.aiueo_badges add column if not exists "description" text not null default '';
alter table public.aiueo_badges add column if not exists "metric" text not null default '';
alter table public.aiueo_badges add column if not exists "threshold" text not null default '';
alter table public.aiueo_badges add column if not exists "active" text not null default '';
alter table public.aiueo_badges add column if not exists "sort" text not null default '';
create index if not exists ix_aiueo_badges_id on public.aiueo_badges ("id");
alter table public.aiueo_badges enable row level security;
revoke all on public.aiueo_badges from anon, authenticated;

create table if not exists public.aiueo_userbadges (rn bigint generated always as identity primary key);
alter table public.aiueo_userbadges add column if not exists "id" text not null default '';
alter table public.aiueo_userbadges add column if not exists "user_id" text not null default '';
alter table public.aiueo_userbadges add column if not exists "code" text not null default '';
alter table public.aiueo_userbadges add column if not exists "ts" text not null default '';
create index if not exists ix_aiueo_userbadges_id on public.aiueo_userbadges ("id");
create index if not exists ix_aiueo_userbadges_user_id on public.aiueo_userbadges ("user_id");
create index if not exists ix_aiueo_userbadges_ts on public.aiueo_userbadges ("ts");
alter table public.aiueo_userbadges enable row level security;
revoke all on public.aiueo_userbadges from anon, authenticated;

create table if not exists public.aiueo_feed (rn bigint generated always as identity primary key);
alter table public.aiueo_feed add column if not exists "id" text not null default '';
alter table public.aiueo_feed add column if not exists "ts" text not null default '';
alter table public.aiueo_feed add column if not exists "kind" text not null default '';
alter table public.aiueo_feed add column if not exists "username" text not null default '';
alter table public.aiueo_feed add column if not exists "text" text not null default '';
create index if not exists ix_aiueo_feed_id on public.aiueo_feed ("id");
create index if not exists ix_aiueo_feed_ts on public.aiueo_feed ("ts");
alter table public.aiueo_feed enable row level security;
revoke all on public.aiueo_feed from anon, authenticated;

create table if not exists public.aiueo_notifications (rn bigint generated always as identity primary key);
alter table public.aiueo_notifications add column if not exists "id" text not null default '';
alter table public.aiueo_notifications add column if not exists "user_id" text not null default '';
alter table public.aiueo_notifications add column if not exists "kind" text not null default '';
alter table public.aiueo_notifications add column if not exists "title" text not null default '';
alter table public.aiueo_notifications add column if not exists "body" text not null default '';
alter table public.aiueo_notifications add column if not exists "ts" text not null default '';
alter table public.aiueo_notifications add column if not exists "read" text not null default '';
alter table public.aiueo_notifications add column if not exists "ref" text not null default '';
alter table public.aiueo_notifications add column if not exists "by_name" text not null default '';
create index if not exists ix_aiueo_notifications_id on public.aiueo_notifications ("id");
create index if not exists ix_aiueo_notifications_user_id on public.aiueo_notifications ("user_id");
create index if not exists ix_aiueo_notifications_ts on public.aiueo_notifications ("ts");
alter table public.aiueo_notifications enable row level security;
revoke all on public.aiueo_notifications from anon, authenticated;

create table if not exists public.aiueo_notifrules (rn bigint generated always as identity primary key);
alter table public.aiueo_notifrules add column if not exists "id" text not null default '';
alter table public.aiueo_notifrules add column if not exists "code" text not null default '';
alter table public.aiueo_notifrules add column if not exists "name" text not null default '';
alter table public.aiueo_notifrules add column if not exists "enabled" text not null default '';
alter table public.aiueo_notifrules add column if not exists "days" text not null default '';
alter table public.aiueo_notifrules add column if not exists "title" text not null default '';
alter table public.aiueo_notifrules add column if not exists "body" text not null default '';
alter table public.aiueo_notifrules add column if not exists "last_run" text not null default '';
create index if not exists ix_aiueo_notifrules_id on public.aiueo_notifrules ("id");
alter table public.aiueo_notifrules enable row level security;
revoke all on public.aiueo_notifrules from anon, authenticated;

create table if not exists public.aiueo_grouprenames (rn bigint generated always as identity primary key);
alter table public.aiueo_grouprenames add column if not exists "id" text not null default '';
alter table public.aiueo_grouprenames add column if not exists "group_id" text not null default '';
alter table public.aiueo_grouprenames add column if not exists "requester_id" text not null default '';
alter table public.aiueo_grouprenames add column if not exists "old_name" text not null default '';
alter table public.aiueo_grouprenames add column if not exists "new_name" text not null default '';
alter table public.aiueo_grouprenames add column if not exists "status" text not null default '';
alter table public.aiueo_grouprenames add column if not exists "note" text not null default '';
alter table public.aiueo_grouprenames add column if not exists "ts" text not null default '';
alter table public.aiueo_grouprenames add column if not exists "decided_by" text not null default '';
alter table public.aiueo_grouprenames add column if not exists "decided_at" text not null default '';
create index if not exists ix_aiueo_grouprenames_id on public.aiueo_grouprenames ("id");
create index if not exists ix_aiueo_grouprenames_group_id on public.aiueo_grouprenames ("group_id");
create index if not exists ix_aiueo_grouprenames_status on public.aiueo_grouprenames ("status");
create index if not exists ix_aiueo_grouprenames_ts on public.aiueo_grouprenames ("ts");
alter table public.aiueo_grouprenames enable row level security;
revoke all on public.aiueo_grouprenames from anon, authenticated;

create table if not exists public.aiueo_pushsubs (rn bigint generated always as identity primary key);
alter table public.aiueo_pushsubs add column if not exists "id" text not null default '';
alter table public.aiueo_pushsubs add column if not exists "user_id" text not null default '';
alter table public.aiueo_pushsubs add column if not exists "endpoint" text not null default '';
alter table public.aiueo_pushsubs add column if not exists "p256dh" text not null default '';
alter table public.aiueo_pushsubs add column if not exists "auth" text not null default '';
alter table public.aiueo_pushsubs add column if not exists "ts" text not null default '';
alter table public.aiueo_pushsubs add column if not exists "ua" text not null default '';
create index if not exists ix_aiueo_pushsubs_id on public.aiueo_pushsubs ("id");
create index if not exists ix_aiueo_pushsubs_user_id on public.aiueo_pushsubs ("user_id");
create index if not exists ix_aiueo_pushsubs_ts on public.aiueo_pushsubs ("ts");
alter table public.aiueo_pushsubs enable row level security;
revoke all on public.aiueo_pushsubs from anon, authenticated;

-- tabel pendukung
create table if not exists public.aiueo_kv (k text primary key, v text not null default '', exp bigint not null default 0);
create index if not exists ix_kv_exp on public.aiueo_kv (exp);
create table if not exists public.aiueo_props (k text primary key, v text not null default '');
create table if not exists public.aiueo_pings (topic text primary key, v text not null default '', ts bigint not null default 0);
create table if not exists public.aiueo_locks (name text primary key, owner text not null default '', until_ms bigint not null default 0);
alter table public.aiueo_kv enable row level security;
alter table public.aiueo_props enable row level security;
alter table public.aiueo_pings enable row level security;
alter table public.aiueo_locks enable row level security;

-- Keamanan: semua tabel tertutup untuk kunci publik. Hanya server (kunci rahasia) yang boleh membaca/menulis.
-- Pengecualian: tabel pings (hanya berisi kode acak + angka versi) boleh dibaca agar HP bisa tahu "ada data baru" tanpa membebani server.
revoke all on public.aiueo_kv, public.aiueo_props, public.aiueo_locks, public.aiueo_pings from anon, authenticated;
grant select on public.aiueo_pings to anon;
drop policy if exists aiueo_pings_read on public.aiueo_pings;
create policy aiueo_pings_read on public.aiueo_pings for select to anon using (true);

-- Kunci penulis tunggal (mencegah dua permintaan menulis bersamaan)
create or replace function public.aiueo_acquire_lock(p_name text, p_owner text, p_ttl_ms int) returns boolean
language plpgsql security definer set search_path = public as $$
declare nowms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint; got boolean;
begin
  insert into public.aiueo_locks as l (name, owner, until_ms) values (p_name, p_owner, nowms + p_ttl_ms)
  on conflict (name) do update set owner = excluded.owner, until_ms = excluded.until_ms where l.until_ms < nowms
  returning true into got;
  return coalesce(got, false);
end $$;
create or replace function public.aiueo_release_lock(p_name text, p_owner text) returns void
language sql security definer set search_path = public as $$
  delete from public.aiueo_locks where name = p_name and owner = p_owner;
$$;
create table if not exists public.aiueo_counters (k text primary key, n bigint not null default 0);
alter table public.aiueo_counters enable row level security;
revoke all on public.aiueo_counters from anon, authenticated;
create or replace function public.aiueo_next_ids(p_key text, p_count int) returns bigint
language sql security definer set search_path = public as $$
  insert into public.aiueo_counters as c (k, n) values (p_key, p_count)
  on conflict (k) do update set n = c.n + p_count
  returning n - p_count + 1;
$$;
revoke all on function public.aiueo_next_ids(text, int) from public, anon, authenticated;
grant execute on function public.aiueo_next_ids(text, int) to service_role;
revoke all on function public.aiueo_acquire_lock(text, text, int) from public, anon, authenticated;
revoke all on function public.aiueo_release_lock(text, text) from public, anon, authenticated;
grant execute on function public.aiueo_acquire_lock(text, text, int) to service_role;
grant execute on function public.aiueo_release_lock(text, text) to service_role;
-- izin untuk service_role (project Supabase baru tidak lagi memberi izin otomatis)
grant usage on schema public to service_role;
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename like 'aiueo\_%' loop
    execute format('grant all on table public.%I to service_role', r.tablename);
  end loop;
  for r in select sequencename from pg_sequences where schemaname = 'public' and sequencename like 'aiueo\_%' loop
    execute format('grant usage, select on sequence public.%I to service_role', r.sequencename);
  end loop;
end $$;
