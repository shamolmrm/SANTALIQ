import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What SANTALIQ collects, why, how long it is kept, and how you control your data.",
  alternates: { canonical: "https://santaliq.supersoftltd.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="SANTALIQ"
      title="Privacy Policy"
      intro={
        <>
          SANTALIQ is a community platform for the Santali language. We collect as little as we can, never sell data, show no ads and use no
          tracking or analytics cookies. This page explains exactly what we store and how you stay in control.
        </>
      }
    >
      <LegalSection id="who" title="1. Who we are">
        <p>
          SANTALIQ (santaliq.supersoftltd.com) is responsible for the personal data described here. Operator name and postal address:{" "}
          <em>[to be added by the owner]</em>. You can reach us any time through the{" "}
          <Link href="/contact" className="font-semibold text-accent">
            contact form
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="collect" title="2. What we collect">
        <ul>
          <li>
            <strong>Account:</strong> email address, display name, a password stored only as an Argon2 hash (we cannot read it), your role,
            and the dates you joined and last signed in. An optional public bio if you write one.
          </li>
          <li>
            <strong>Sign-in session:</strong> one essential cookie (<code>santaliq_session</code>) that keeps you signed in for up to 30
            days. We store only a hash of it. There are no advertising, analytics or third-party cookies.
          </li>
          <li>
            <strong>What you contribute:</strong> dictionary entries, writing, heritage items, voice recordings, reports and contact messages,
            with their review status and reviewer notes.
          </li>
          <li>
            <strong>Voice recordings:</strong> the audio, the text you read, its length, and the optional speaker details you choose to
            give (dialect, region, age range, gender), together with the consent choices you made and when.
          </li>
          <li>
            <strong>Security log:</strong> important actions (for example sign-in, sign-up, review decisions, deletions) with time and IP
            address, to protect accounts and investigate abuse. IP addresses are also used briefly for rate limiting.
          </li>
          <li>
            <strong>AI usage:</strong> if SANTALIQ AI chat is enabled, we log only who asked, the model and the number of tokens, never the
            content of your questions or answers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="use" title="3. Why we use it">
        <ul>
          <li>To run your account and the features you use (legal basis: providing the service you asked for).</li>
          <li>To publish what you choose to publish, with credit to you (your choice and consent).</li>
          <li>
            To build verified, openly licensed Santali language resources, including speech technology, only where you consented (consent,
            which you can withdraw).
          </li>
          <li>To keep the platform secure and prevent spam and abuse (legitimate interest).</li>
          <li>To send emails you need: email confirmation, password reset, replies to your messages. No newsletters without asking.</li>
        </ul>
      </LegalSection>

      <LegalSection id="voice" title="4. Voice recordings">
        <p>
          You record only after giving consent, and you choose separately whether others may listen and whether your recordings may be used
          for research and Santali speech technology. Your voice is <strong>never used to clone or imitate you</strong>. Every recording is
          checked by a reviewer. You can change your choices, delete a recording, or delete all your voice data at any time on the{" "}
          <Link href="/voice" className="font-semibold text-accent">
            Voice page
          </Link>
          . Deleted recordings are also removed from our backups.
        </p>
      </LegalSection>

      <LegalSection id="public" title="5. What is public">
        <p>
          Public: your display name, bio and join month on your profile; your published writing; verified dictionary entries and heritage
          items with your name as contributor; voice recordings only if you chose public listening. Never public: your email address, role,
          drafts, pending contributions, IP addresses and the security log.
        </p>
        <p>
          Verified dictionary entries are released as an open dataset under{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" className="font-semibold text-accent">
            CC BY 4.0
          </a>
          . The dataset contains contributor display names, never emails.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="6. Who else processes data">
        <ul>
          <li>
            <strong>Hosting:</strong> SANTALIQ runs on a server rented from Contabo GmbH. Your data is stored there.
          </li>
          <li>
            <strong>Translator:</strong> the default translator runs on SANTALIQ&apos;s own server; your text is not sent to anyone else.
            Translations may be cached for up to 7 days to make repeated requests faster.
          </li>
          <li>
            <strong>Optional engines (currently switched off):</strong> if the Google engine is enabled and you choose it, the text you
            translate is sent to Google Cloud Translation. If SANTALIQ AI chat is enabled, your question and matching SANTALIQ sources are
            sent to Anthropic to generate the answer. These are clearly labelled in the tools when available.
          </li>
          <li>
            <strong>Email:</strong> sent through our own mail server.
          </li>
        </ul>
        <p>We do not sell or rent personal data, and we do not share it for advertising.</p>
      </LegalSection>

      <LegalSection id="retention" title="7. How long we keep it">
        <ul>
          <li>Account data: until you delete your account.</li>
          <li>Sign-in sessions: up to 30 days. Password-reset links: 1 hour. Email-confirmation links: 2 days.</li>
          <li>Contributions: until you delete or withdraw them, or delete your account (see below for verified dictionary entries).</li>
          <li>Backups: database backups are kept for up to 14 days on the server and up to 30 days in an offline copy.</li>
        </ul>
      </LegalSection>

      <LegalSection id="rights" title="8. Your rights and controls">
        <ul>
          <li>See and edit your profile and contributions in your account.</li>
          <li>Withdraw consent: delete heritage items, voice recordings, or all voice data whenever you want.</li>
          <li>
            <strong>Delete your account</strong> from your{" "}
            <Link href="/account" className="font-semibold text-accent">
              account page
            </Link>
            . This removes your account, writing, heritage submissions, voice recordings and consent. Verified dictionary entries you
            contributed remain in the open dictionary because they were published under an open licence, but your name and account are
            removed from them.
          </li>
          <li>
            Ask for a copy of your data, a correction, or anything else through the{" "}
            <Link href="/contact" className="font-semibold text-accent">
              contact form
            </Link>{" "}
            (topic &quot;My data&quot;). We reply within 30 days.
          </li>
          <li>You may also complain to your data-protection authority.</li>
        </ul>
      </LegalSection>

      <LegalSection id="children" title="9. Children">
        <p>
          Members under 18 need the agreement of a parent or guardian, especially for voice recordings. If you believe a child has shared
          data without that agreement, contact us and we will remove it.
        </p>
      </LegalSection>

      <LegalSection id="security" title="10. Security">
        <p>
          Encrypted connections (HTTPS) everywhere, hashed passwords and session tokens, databases that are not reachable from the
          internet, role-based access for reviewers and admins, rate limits, and an audit log. No system is perfect; if we learn of a breach
          affecting you, we will tell you.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes">
        <p>
          We will update this page when our practices change and show the date at the top. Important changes, such as a new consent for
          voice data, are announced on the site, and where consent is needed we ask again.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
