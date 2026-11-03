import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for using SANTALIQ and for the content you contribute.",
  alternates: { canonical: "https://santaliq.supersoftltd.com/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="SANTALIQ"
      title="Terms of Use"
      intro={
        <>
          SANTALIQ exists to help the Santali language thrive. By using the site or creating an account you agree to these terms. Please also
          read our{" "}
          <Link href="/privacy" className="font-semibold text-accent">
            Privacy Policy
          </Link>
          .
        </>
      }
    >
      <LegalSection id="account" title="1. Your account">
        <ul>
          <li>Give a real email address and keep your password safe. You are responsible for activity on your account.</li>
          <li>One person per account. Members under 18 need a parent or guardian&apos;s agreement.</li>
          <li>You can delete your account at any time from your account page.</li>
        </ul>
      </LegalSection>

      <LegalSection id="content" title="2. Content you contribute">
        <ul>
          <li>
            <strong>Writing:</strong> you keep the copyright of what you write. You allow SANTALIQ to host, display and convert it into the
            other Santali scripts, and to show it with your name, while it is published. You can unpublish or delete it at any time.
          </li>
          <li>
            <strong>Dictionary entries:</strong> once verified, entries are published as part of the open SANTALIQ lexicon under{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" className="font-semibold text-accent">
              CC BY 4.0
            </a>
            , with credit to contributors. Because others may already be using that open data, verified entries stay in the dictionary even
            if you delete your account; your name is then removed.
          </li>
          <li>
            <strong>Heritage items:</strong> you confirm that you have permission to share the story, song or knowledge publicly and name
            its source. You can withdraw an item at any time.
          </li>
          <li>
            <strong>Voice recordings:</strong> used only as you agreed in the voice consent. You can change or withdraw it at any time.
          </li>
          <li>Only share what you have the right to share. Do not upload other people&apos;s work or voices without permission.</li>
        </ul>
      </LegalSection>

      <LegalSection id="rules" title="3. Community rules">
        <p>Do not use SANTALIQ to:</p>
        <ul>
          <li>post hateful, harassing, sexual, violent or illegal content, or attack any person or community;</li>
          <li>share sacred, secret or private community knowledge without the community&apos;s permission;</li>
          <li>publish other people&apos;s personal information;</li>
          <li>spam, impersonate others, or submit false language data on purpose;</li>
          <li>attack, overload, scrape at scale or try to break into the service.</li>
        </ul>
        <p>
          Reviewers and admins may reject contributions, remove content, and suspend accounts that break these rules. If you think a
          decision is wrong, tell us through the{" "}
          <Link href="/contact" className="font-semibold text-accent">
            contact form
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="tools" title="4. Language tools and machine output">
        <ul>
          <li>
            Translations, script conversions and AI answers are produced by software and can be wrong. They are labelled as such. Do not
            rely on them for legal, medical or other important decisions without checking with a fluent speaker.
          </li>
          <li>
            The translator uses Meta&apos;s NLLB-200 model, which is licensed for <strong>non-commercial use only</strong>; translations may
            not be used commercially.
          </li>
          <li>Script conversion rules are drafts until reviewed by native speakers.</li>
        </ul>
      </LegalSection>

      <LegalSection id="service" title="5. The service">
        <p>
          SANTALIQ is free and provided &quot;as is&quot;, in beta. Features may change, pause or end, and the service may sometimes be
          unavailable. To the extent the law allows, SANTALIQ is not liable for indirect losses or for content contributed by members.
        </p>
        <p>
          The SANTALIQ name and logo belong to SANTALIQ. The open dataset is licensed separately as stated on the{" "}
          <Link href="/dataset" className="font-semibold text-accent">
            dataset page
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="changes" title="6. Changes and contact">
        <p>
          We may update these terms and will show the date at the top; important changes are announced on the site. Questions:{" "}
          <Link href="/contact" className="font-semibold text-accent">
            contact us
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
