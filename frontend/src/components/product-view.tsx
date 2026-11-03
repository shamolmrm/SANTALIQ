"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, EntryStatus } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { categoryLabel, formatPrice, type Listing } from "@/lib/listings";

function Gallery({ x }: { x: Listing }) {
  const [i, setI] = useState(0);
  if (x.image_urls.length === 0)
    return (
      <div className="grid aspect-square place-items-center rounded-[var(--radius-card)] border border-line bg-bg-sunken text-6xl text-muted">
        ᱥ
      </div>
    );
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element -- user uploads served by the API */}
      <img src={x.image_urls[i]} alt={x.title} className="aspect-square w-full rounded-[var(--radius-card)] border border-line object-cover" />
      {x.image_urls.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {x.image_urls.map((u, n) => (
            <button
              key={u}
              onClick={() => setI(n)}
              aria-label={`${tr("Photo")} ${n + 1}`}
              className={`overflow-hidden rounded-xl border-2 ${n === i ? "border-accent" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails of user uploads */}
              <img src={u} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MoreFromSeller({ x }: { x: Listing }) {
  const [items, setItems] = useState<Listing[]>([]);
  useEffect(() => {
    if (!x.posted_by_id) return;
    api<Listing[]>(`/listings?section=market&seller=${x.posted_by_id}`)
      .then((r) => setItems(r.filter((o) => o.id !== x.id).slice(0, 4)))
      .catch(() => setItems([]));
  }, [x.id, x.posted_by_id]);
  if (items.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="text-xl font-bold">
        {tr("More from")} {x.posted_by}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((o) => (
          <Link key={o.id} href={`/market/${o.id}`} className="overflow-hidden rounded-xl border border-line bg-bg-elevated hover:border-accent/40">
            {o.image_url && (
              // eslint-disable-next-line @next/next/no-img-element -- user uploads
              <img src={o.image_url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
            )}
            <div className="p-3">
              <p className="line-clamp-1 text-sm font-semibold">{o.title}</p>
              <p className="text-sm font-bold text-accent">{formatPrice(o)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Product page for a Market listing: gallery, price, stock, ways to buy, seller. */
export function ProductView({ x }: { x: Listing }) {
  const [copied, setCopied] = useState(false);
  const price = formatPrice(x);
  const soldOut = x.stock === 0;
  const wa = x.whatsapp ? x.whatsapp.replace(/^\+/, "") : null;

  function openWhatsApp() {
    const text = `${tr("Hello, I am interested in")} “${x.title}” (SANTALIQ Market): ${window.location.href}`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: x.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav className="text-sm text-muted">
        <Link href="/market" className="hover:text-fg">
          {tr("SANTALIQ Market")}
        </Link>{" "}
        / <span>{tr(categoryLabel("market", x.category))}</span>
      </nav>
      {x.status !== "verified" && (
        <div className="mt-4">
          <Alert tone="info">
            <EntryStatus status={x.status} /> {x.review_note ?? tr("Waiting for review. Only you and reviewers can see this.")}
          </Alert>
        </div>
      )}
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <Gallery x={x} />
        <div>
          <h1 className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">{x.title}</h1>
          {price && <p className="mt-4 text-4xl font-extrabold text-accent tabular-nums">{price}</p>}
          <p className="mt-2 text-sm">
            {x.stock == null ? null : soldOut ? (
              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 font-medium text-red-600">{tr("Out of stock")}</span>
            ) : (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-medium text-accent">
                {tr("In stock")}: {x.stock}
              </span>
            )}
            {x.location && <span className="ml-3 text-muted">📍 {x.location}</span>}
          </p>

          <div className="mt-8 grid gap-3">
            {wa && !soldOut && (
              <button onClick={openWhatsApp} className="rounded-full bg-[#25D366] px-6 py-3 text-center font-semibold text-white">
                {tr("Buy on WhatsApp")}
              </button>
            )}
            {x.posted_by_id && (
              <Link href={`/messages/${x.posted_by_id}`} className="rounded-full bg-fg px-6 py-3 text-center font-semibold text-bg">
                {tr("Message the seller")}
              </Link>
            )}
            {x.contact && (
              <p className="rounded-xl border border-line px-4 py-3 text-sm">
                <span className="text-muted">{tr("Contact the seller:")}</span> <strong className="break-all">{x.contact}</strong>
              </p>
            )}
            <button onClick={share} className="rounded-full border border-line px-6 py-3 font-semibold">
              {copied ? tr("Link copied ✓") : tr("Share")}
            </button>
          </div>

          {x.posted_by && x.posted_by_id && (
            <p className="mt-6 text-sm text-muted">
              {tr("Sold by")}{" "}
              <Link href={`/people/${x.posted_by_id}`} className="font-semibold text-fg hover:text-accent">
                {x.posted_by}
              </Link>
              {x.credit && ` · ${x.credit}`}
            </p>
          )}

          <h2 className="mt-10 text-lg font-bold">{tr("Description")}</h2>
          <div className="mt-2 leading-relaxed whitespace-pre-wrap">{x.description}</div>

          <p className="mt-8 rounded-xl bg-bg-sunken p-4 text-sm text-muted">
            {tr("SANTALIQ does not take part in sales. Meet in safe places, check items before paying, and never send money in advance to strangers.")}
          </p>
        </div>
      </div>
      <MoreFromSeller x={x} />
    </article>
  );
}
