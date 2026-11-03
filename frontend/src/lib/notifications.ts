import { tr } from "@/lib/i18n";

export type Notice = {
  id: string;
  kind: string;
  data: { actor?: string; who?: string; title?: string; slug?: string; id?: string; decision?: string; note?: string | null };
  created_at: string;
  read: boolean;
};

/** Human text and link for a notification (translated with tr). */
export function describe(n: Notice): { text: string; href: string } {
  const d = n.data;
  const ok = d.decision === "verified";
  const title = d.title ?? "";
  switch (n.kind) {
    case "follow":
      return { text: tr("{name} started following you.", { name: d.actor ?? "" }), href: d.who ? `/people/${d.who}` : "/account" };
    case "comment":
      return { text: tr("{name} commented on “{title}”.", { name: d.actor ?? "", title }), href: `/write/${d.slug}#comments` };
    case "entry_reviewed":
      return {
        text: ok ? tr("Your word “{title}” was verified and is now in the dictionary.", { title }) : tr("Your word “{title}” was not accepted.", { title }),
        href: "/account",
      };
    case "heritage_reviewed":
      return {
        text: ok ? tr("Your heritage item “{title}” was verified and published.", { title }) : tr("Your heritage item “{title}” was not accepted.", { title }),
        href: d.slug ? `/heritage/${d.slug}` : "/heritage/submit",
      };
    case "voice_reviewed":
      return {
        text: ok ? tr("Your recording “{title}” was verified. Thank you!", { title }) : tr("Your recording “{title}” was not accepted.", { title }),
        href: "/voice",
      };
    case "job_reviewed":
      return {
        text: ok ? tr("Your listing “{title}” is now public.", { title }) : tr("Your listing “{title}” was not accepted.", { title }),
        href: d.id ? `/careers/${d.id}` : "/careers",
      };
    case "listing_reviewed":
      return {
        text: ok ? tr("Your listing “{title}” is now public.", { title }) : tr("Your listing “{title}” was not accepted.", { title }),
        href: d.id ? `/listings/${d.id}` : "/",
      };
    case "post_removed":
      return { text: tr("Your piece “{title}” was removed by moderators.", { title }), href: d.slug ? `/write/${d.slug}` : "/write/mine" };
    default:
      return { text: n.kind, href: "/notifications" };
  }
}
