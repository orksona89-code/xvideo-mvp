REVOKE UPDATE ON TABLE public.video_upload_sessions FROM anon, authenticated;
GRANT UPDATE (completed_at, video_id) ON TABLE public.video_upload_sessions TO authenticated;
