"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RequireSession } from "@/components/require-session";
import { Alert, Button, Card, EntryStatus, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { categoryLabel, CURRENCIES, formatPrice, type Listing, listingHref, type Section, SECTIONS, youtubeEmbed } from "@/lib/listings";

/** Public grid of verified listings for one section, with category filter and search. */
export function ListingsBrowser({ section }: { section: Section }) {
  const cfg = SECTIONS[section];
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [items, setItems] = useState<Listing[] | null>(null);

  useEffect(() => {
    const p = new URLSearchParams({ section });
    if (category) p.set("category", category);
    if (q.trim()) p.set("q", q.trim());
    if (sort !== "new") p.set("sort", sort);
    const t = setTimeout(() => {
      api<Listing[]>(`/listings?${p}`)
        .then(setItems)
        .catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [section, category, q, sort]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <PageHeader eyebrow={tr(cfg.eyebrow)} title={tr(cfg.title)} lead={tr(cfg.lead)} />
        <Link href={`/listings/new?section=${section}`} className="rounded-full bg-fg px-6 py-3 font-semibold text-bg">
          {tr(cfg.cta)}
        </Link>
      </div>
      <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {[["", "All"] as [string, string], ...cfg.categories].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setCategory(v)}
              className={`rounded-full px-4 py-1.5 text-sm ${category === v ? "bg-fg text-bg" : "border border-line text-muted hover:text-fg"}`}
            >
              {tr(label)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {section === "market" && (
            <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={tr("Sort")} className="py-2">
              <option value="new">{tr("Newest")}</option>
              <option value="price_asc">{tr("Price: low to high")}</option>
              <option value="price_desc">{tr("Price: high to low")}</option>
            </Select>
          )}
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search")} aria-label={tr("Search")} className="md:max-w-xs" />
        </div>
      </div>
      <div className="mt-8">
        {!items && <p className="text-muted">{tr("Loading…")}</p>}
        {items?.length === 0 && <Alert tone="info">{tr("Nothing here yet. Be the first to add something.")}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map((x) => (
            <Link
              key={x.id}
              href={listingHref(x)}
              className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-bg-elevated shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40"
            >
              {x.image_url && (
                // eslint-disable-next-line @next/next/no-img-element -- user uploads served by the API
                <img src={x.image_url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              )}
              <div className="p-5">
                <p className="text-xs font-medium tracking-wide text-accent uppercase">{tr(categoryLabel(section, x.category))}</p>
                <h2 className="mt-1 text-lg font-bold">{x.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{x.description}</p>
                {section === "market" && formatPrice(x) && <p className="mt-3 text-xl font-extrabold text-accent tabular-nums">{formatPrice(x)}</p>}
                {section === "market" && x.stock === 0 && <p className="mt-1 text-xs font-medium text-red-600">{tr("Out of stock")}</p>}
                {(x.credit || x.location) && (
                  <p className="mt-2 text-sm text-muted">{[x.credit, x.location].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** One listing: image or embedded video, details, how to buy / open. */
export function ListingDetail({ x }: { x: Listing }) {
  const cfg = SECTIONS[x.section];
  const embed = youtubeEmbed(x.url);
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href={cfg.href} className="text-sm text-muted hover:text-fg">
        ← {tr(cfg.eyebrow)}
      </Link>
      {x.status !== "verified" && (
        <div className="mt-6 flex items-center gap-3">
          <EntryStatus status={x.status} />
          {x.review_note && <span className="text-sm text-muted">{x.review_note}</span>}
        </div>
      )}
      <p className="mt-8 text-xs font-semibold tracking-wide text-accent uppercase">{tr(categoryLabel(x.section, x.category))}</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">{x.title}</h1>
      {x.image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads served by the API
        <img src={x.image_url} alt={x.title} className="mt-8 w-full rounded-[var(--radius-card)] border border-line" />
      )}
      {embed && (
        <div className="mt-8 aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line">
          <iframe
            src={embed}
            title={x.title}
            className="size-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
        {formatPrice(x) && (
          <div>
            <dt className="text-muted">{tr("Price")}</dt>
            <dd className="text-lg font-semibold">{formatPrice(x)}</dd>
          </div>
        )}
        {x.credit && (
          <div>
            <dt className="text-muted">{tr("By / source")}</dt>
            <dd>{x.credit}</dd>
          </div>
        )}
        {x.location && (
          <div>
            <dt className="text-muted">{tr("Location")}</dt>
            <dd>{x.location}</dd>
          </div>
        )}
        {x.posted_by && x.posted_by_id && (
          <div>
            <dt className="text-muted">{tr("Shared by")}</dt>
            <dd>
              <Link href={`/people/${x.posted_by_id}`} className="hover:text-accent">
                {x.posted_by}
              </Link>
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-8 leading-relaxed whitespace-pre-wrap">{x.description}</div>
      <div className="mt-8 flex flex-wrap gap-3">
        {x.url && !embed && (
          <a href={x.url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full bg-fg px-6 py-3 font-semibold text-bg">
            {tr("Open link ↗")}
          </a>
        )}
        {x.contact && (
          <p className="rounded-xl border border-line px-4 py-3">
            <span className="text-muted">{tr("Contact the seller:")}</span> <strong>{x.contact}</strong>
          </p>
        )}
        {x.posted_by_id && (
          <Link href={`/messages/${x.posted_by_id}`} className="rounded-full border border-line px-6 py-3 font-semibold">
            {tr("Send a message")}
          </Link>
        )}
      </div>
      {x.section === "market" && (
        <p className="mt-8 rounded-xl bg-bg-sunken p-4 text-sm text-muted">
          {tr("SANTALIQ does not take part in sales. Meet in safe places, check items before paying, and never send money in advance to strangers.")}
        </p>
      )}
    </article>
  );
}

function MyListings({ refresh }: { refresh: number }) {
  const [items, setItems] = useState<Listing[] | null>(null);
  const load = useCallback(() => {
    api<Listing[]>("/listings/mine")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  useEffect(load, [load, refresh]);
  async function remove(id: string) {
    if (!window.confirm(tr("Remove this listing?"))) return;
    await api(`/listings/${id}`, { method: "DELETE" });
    load();
  }
  if (!items) return <p className="text-muted">{tr("Loading…")}</p>;
  if (items.length === 0) return <p className="text-sm text-muted">{tr("You have not posted any listings yet.")}</p>;
  return (
    <ul className="grid gap-3">
      {items.map((x) => (
        <li key={x.id} className="rounded-xl border border-line bg-bg-elevated p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <Link href={listingHref(x)} className="font-semibold hover:text-accent">
              {x.title}
            </Link>
            <EntryStatus status={x.status} />
          </div>
          <p className="mt-1 text-xs text-muted">{tr(SECTIONS[x.section].eyebrow)}</p>
          {x.review_note && (
            <p className="mt-2 text-muted">
              {tr("Reviewer note:")} {x.review_note}
            </p>
          )}
          <button onClick={() => remove(x.id)} className="mt-2 text-xs text-muted hover:text-fg">
            {tr("Remove")}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Submission form for any section (multipart, optional image). */
export function ListingForm({ initialSection }: { initialSection: Section }) {
  const [section, setSection] = useState<Section>(initialSection);
  const [category, setCategory] = useState(SECTIONS[initialSection].categories[0][0]);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    for (const [k, v] of [...fd.entries()]) if (v === "" || (v instanceof File && !v.name)) fd.delete(k);
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/v1/listings", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error(typeof b.detail === "string" ? b.detail : tr("Could not submit."));
      }
      formEl.reset();
      setMsg({ tone: "success", text: tr("Thank you! A reviewer will check it before it is public.") });
      setRefresh((n) => n + 1);
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof Error ? err.message : tr("Could not submit.") });
    } finally {
      setBusy(false);
    }
  }

  const cfg = SECTIONS[section];
  const needsImage = section === "media" && category === "photo";
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <Card>
        <form onSubmit={submit} className="space-y-5">
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={tr("Where")}>
              <Select
                name="section"
                value={section}
                onChange={(e) => {
                  const s = e.target.value as Section;
                  setSection(s);
                  setCategory(SECTIONS[s].categories[0][0]);
                }}
              >
                {(Object.keys(SECTIONS) as Section[]).map((s) => (
                  <option key={s} value={s}>
                    {tr(SECTIONS[s].eyebrow)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tr("Kind")}>
              <Select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {cfg.categories.map(([v, label]) => (
                  <option key={v} value={v}>
                    {tr(label)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={tr("Title")}>
            <Input name="title" required minLength={3} maxLength={200} />
          </Field>
          <Field label={tr("Description")}>
            <Textarea name="description" required minLength={10} maxLength={10000} rows={6} />
          </Field>
          {section === "market" && (
            <>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label={tr("Price")}>
                  <Input name="price_amount" type="number" min={0} max={10000000} step="0.01" required inputMode="decimal" />
                </Field>
                <Field label={tr("Currency")}>
                  <Select name="currency" defaultValue="INR">
                    {CURRENCIES.map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={tr("In stock (optional)")}>
                  <Input name="stock" type="number" min={0} max={100000} inputMode="numeric" />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={tr("WhatsApp number")} hint={tr("With country code, e.g. +91 98765 43210. Shown as a Buy button.")}>
                  <Input name="whatsapp" type="tel" maxLength={20} />
                </Field>
                <Field label={tr("Other contact (optional)")} hint={tr("Phone or email — shown publicly.")}>
                  <Input name="contact" maxLength={200} />
                </Field>
              </div>
            </>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={section === "library" ? tr("Author / publisher") : tr("Creator / credit (optional)")}>
              <Input name="credit" maxLength={300} />
            </Field>
            <Field label={tr("Location (optional)")}>
              <Input name="location" maxLength={120} />
            </Field>
          </div>
          {!needsImage && (
            <Field
              label={section === "media" ? tr("Link (YouTube, SoundCloud…)") : tr("Link (https://…, optional)")}
              hint={section === "library" ? tr("Only link to legal copies (publisher, library, archive).") : undefined}
            >
              <Input name="url" type="url" pattern="https://.*" maxLength={500} required={section === "media"} />
            </Field>
          )}
          {section === "market" && (
            <Field label={tr("Product photos (up to 4)")} hint={tr("JPEG, PNG or WebP, up to 3 MB each. The first photo is the main one.")}>
              <input
                name="images"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="text-sm"
                onChange={(e) => {
                  if ((e.target.files?.length ?? 0) > 4) {
                    e.target.value = "";
                    setMsg({ tone: "error", text: tr("Up to 4 photos.") });
                  }
                }}
              />
            </Field>
          )}
          {needsImage && (
            <Field label={tr("Photo")} hint={tr("JPEG, PNG or WebP, up to 3 MB.")}>
              <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required className="text-sm" />
            </Field>
          )}
          <p className="text-xs text-muted">{tr("Share only what you own or have permission to share. A reviewer checks every listing.")}</p>
          <Button type="submit" disabled={busy}>
            {busy ? tr("Sending…") : tr("Send for review")}
          </Button>
        </form>
      </Card>
      <div>
        <h2 className="text-lg font-bold">{tr("My listings")}</h2>
        <div className="mt-4">
          <MyListings refresh={refresh} />
        </div>
      </div>
    </div>
  );
}

export function ListingFormPage({ section }: { section: Section }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <PageHeader eyebrow="SANTALIQ" title={tr("Share with the community")} />
      <div className="mt-10">
        <RequireSession>{() => <ListingForm initialSection={section} />}</RequireSession>
      </div>
    </section>
  );
}
