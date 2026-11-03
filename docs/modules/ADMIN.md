# Module: Admin dashboard

**Pages:** `/admin/*`. They have a sidebar, and its badges count open work.
**Code:** `frontend/src/app/admin/`, `frontend/src/components/admin/`, `backend/app/modules/admin/`.

| Page | Who | What |
| --- | --- | --- |
| Overview `/admin` | reviewer+ | Counts across all areas (dictionary, heritage, voice, writing, members, AI usage) and a "Needs attention" list with links. Admins also see system status, recent activity and roles. |
| Review `/admin/review?tab=` | reviewer+ | Dictionary, Heritage and Voice queues, each tab with a pending count. Nobody can review their own contribution (admins excepted). |
| Content `/admin/content` | reviewer+ | Reported writing, plus every published or removed piece with search and remove/restore. Drafts are never listed. |
| Users `/admin/users` | admin | Search, change roles (member, reviewer, admin), disable or enable accounts. An admin cannot change their own role. |
| Activity log `/admin/activity` | admin | The audit log with filters by area. IP addresses are not shown. |
| System `/admin/system` | admin | Status of the database, Redis and translator; feature switches (AI chat, Google, email); last backup; disk and voice storage; table sizes; dataset licence. |

## Design choices
- Secrets and feature switches stay in the server `.env` and are **not editable from the browser**. A stolen admin session therefore cannot change keys.
- `backup.sh` writes `last_backup` to the `system_status` table (migration 0009), and the System page reads it there. The API container never reads the host's backup directory.

## API
`GET /api/v1/admin/overview` (reviewer+) · `GET /admin/posts?status=&q=` (reviewer+) · `GET /admin/activity?action=` (admin) · `GET /admin/system` (admin). These are in addition to the existing review, moderation and user endpoints.
