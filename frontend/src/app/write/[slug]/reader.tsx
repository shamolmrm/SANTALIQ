"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ScriptSwitch } from "@/components/script-switch";
import { Alert, Button, Textarea } from "@/components/ui";
import { api, hasRole, useSession } from "@/lib/api";
import { Markdown } from "@/lib/markdown";
import { convert, type Script } from "@/lib/script/engine";
import { formatDate, KIND_LABEL, type Post } from "@/lib/write";

import { tr } from "@/lib/i18n";
function ReportBox({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  async function send() {
    try {
      const r = await api<{ status: string }>(`/write/posts/${postId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setMsg({ tone: "success", text: r.status });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : tr("Could not send report.") });
    }
  }
  if (msg) return <Alert tone={msg.tone}>{msg.text}</Alert>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-muted hover:text-fg">
        {tr("Report this piece")}</button>
    );
  return (
    <div className="space-y-3">
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder={tr("What is wrong with this piece?")} />
      <div className="flex gap-2">
        <Button onClick={send} disabled={reason.trim().length < 3}>
          {tr("Send report")}</Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {tr("Cancel")}</Button>
      </div>
    </div>
  );
}

export function ReadPost({ slug, initial }: { slug: string; initial: Post | null }) {
  const router = useRouter();
  const { user } = useSession();
  const [post, setPost] = useState<Post | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<Script | null>(null);

  // Always refresh in the browser: the server copy may be up to a minute old, and
  // drafts / moderator views need the session cookie.
  useEffect(() => {
    api<Post>(`/write/posts/${encodeURIComponent(slug)}`)
      .then(setPost)
      .catch((e) => setError(e.status === 404 ? tr("This piece does not exist or is not published.") : e.message));
  }, [slug]);

  const shown = script ?? post?.script ?? "olck";
  const view = useMemo(() => {
    if (!post) return null;
    const c = (t: string) => convert(t, post.script, shown, { capitalShortcuts: false });
    return { title: c(post.title), body: c(post.body) };
  }, [post, shown]);

  if (error)
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Alert>{error}</Alert>
        <Link href="/write" className="mt-6 inline-block font-semibold text-accent">
          {tr("← Back to SANTALIQ Write")}</Link>
      </section>
    );
  if (!post || !view) return <section className="mx-auto max-w-3xl px-4 py-16 text-muted">{tr("Loading…")}</section>;

  const isAuthor = user?.id === post.author.id;
  const converted = shown !== post.script;

  async function moderate(action: "remove" | "restore") {
    const note = action === "remove" ? window.prompt(tr("Reason shown to the author (optional)")) ?? undefined : undefined;
    await api(`/admin/posts/${post!.id}/moderate`, { method: "POST", body: JSON.stringify({ action, note }) });
    router.refresh();
    setPost({ ...post!, status: action === "remove" ? "removed" : "published" });
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/write" className="text-sm text-muted hover:text-fg">
        {tr("← SANTALIQ Write")}</Link>

      {post.status !== "published" && (
        <div className="mt-6">
          <Alert tone={post.status === "removed" ? "error" : "info"}>
            {post.status === "draft" ? tr("Draft — only you can see this.") : `${tr("Removed by moderators.")}${post.moderation_note ? ` ${tr("Note:")} ${post.moderation_note}` : ""}`}
          </Alert>
        </div>
      )}

      <p className="mt-8 text-xs font-semibold tracking-wide text-accent uppercase">{tr(KIND_LABEL[post.kind])}</p>
      <h1 className="mt-3 font-display text-4xl leading-tight font-bold tracking-tight sm:text-5xl">{view.title}</h1>
      <p className="mt-4 text-muted">
        <Link href={`/people/${post.author.id}`} className="font-medium text-fg hover:text-accent">
          {post.author.display_name}
        </Link>
        {post.published_at && (
          <>
            {" · "}
            {/* locale formatting differs between server and browser */}
            <time dateTime={post.published_at} suppressHydrationWarning>
              {formatDate(post.published_at)}
            </time>
          </>
        )}
      </p>

      <div className="mt-8 border-y border-line py-4">
        <ScriptSwitch value={shown} original={post.script} onChange={setScript} />
        {converted && (
          <p className="mt-2 text-xs text-muted">{tr("Converted automatically with draft rules — the ● script is the author's original.")}</p>
        )}
      </div>

      <div className={`mt-6 text-lg leading-relaxed sm:text-xl ${post.kind === "poetry" ? "font-medium" : ""}`}>
        <Markdown source={view.body} />
      </div>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        {isAuthor ? (
          <Link href={`/write/edit/${post.id}`} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">
            {tr("Edit")}</Link>
        ) : user && post.status === "published" ? (
          <ReportBox postId={post.id} />
        ) : (
          <span />
        )}
        {hasRole(user, "reviewer") && !isAuthor && (
          <Button variant={post.status === "removed" ? "secondary" : "danger"} onClick={() => moderate(post.status === "removed" ? "restore" : "remove")}>
            {post.status === "removed" ? tr("Restore") : tr("Remove (moderator)")}
          </Button>
        )}
      </footer>
    </article>
  );
}
