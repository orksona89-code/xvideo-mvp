-- Keep social activity scoped to videos that have passed moderation.
-- Owners may still see their own pending uploads through the videos table,
-- but those rows must not expose likes/comments or accept new activity.

begin;

drop policy if exists "Likes are public" on public.video_likes;
drop policy if exists "Users like as themselves" on public.video_likes;

create policy "Likes are visible on approved videos"
on public.video_likes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.videos as v
    where v.id = video_likes.video_id
      and v.status = 'approved'
  )
);

create policy "Users like approved videos as themselves"
on public.video_likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.videos as v
    where v.id = video_likes.video_id
      and v.status = 'approved'
  )
);

drop policy if exists "Comments are public" on public.video_comments;
drop policy if exists "Users create own comments" on public.video_comments;

create policy "Comments are visible on approved videos"
on public.video_comments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.videos as v
    where v.id = video_comments.video_id
      and v.status = 'approved'
  )
);

create policy "Users comment on approved videos as themselves"
on public.video_comments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.videos as v
    where v.id = video_comments.video_id
      and v.status = 'approved'
  )
);

drop policy if exists "Users submit reports" on public.video_reports;

create policy "Users report approved videos"
on public.video_reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and exists (
    select 1
    from public.videos as v
    where v.id = video_reports.video_id
      and v.status = 'approved'
  )
);

commit;
