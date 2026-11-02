import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Privacy Policy — ${SITE.name}`, description: `${SITE.name} collects no personal data. Here is exactly what the app stores on your device and why.` };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" kicker="Silicon Hall" updated={SITE.policiesUpdated}>
      <p className="info-lede">{SITE.name} does not collect, store or share any personal information. There are no accounts, no ads, no analytics and no tracking. This page explains the little the app does keep, and where.</p>

      <h2>What we collect</h2>
      <p>Nothing. The app never sends any data from your device to us or to anyone else. It makes no network requests at all once it has loaded: it does not phone home, it contains no advertising or analytics software, and it embeds no third-party services.</p>

      <h2>What stays on your device</h2>
      <p>To remember your progress between visits, the app keeps a small amount of information in your device's local storage (the browser's "local storage" on the web, or the app's own storage on iOS and Android). This information never leaves your device:</p>
      <ul>
        <li><strong>Secrets you have found</strong> in each exhibit, so your progress badges stay accurate.</li>
        <li><strong>Documents you write</strong> inside an exhibit's word processor, so they are still there when you come back.</li>
        <li><strong>Your display preference</strong> (single-screen or dual-screen layout).</li>
      </ul>
      <p>You can erase all of it at any time: use the "reset progress" option in an exhibit's secrets panel, clear the site data in your browser, or uninstall the app. There is no copy anywhere else to delete.</p>

      <h2>Files you choose to save</h2>
      <p>When you "print" a document inside an exhibit, the app creates an image or text file and saves it to your device the way any download would. That file is created on your device only, and you control it from there. The app can also copy text to your clipboard when you ask it to.</p>

      <h2>Children</h2>
      <p>The app is suitable for all ages. Because it collects no information from anyone, it collects no information from children.</p>

      <h2>Permissions</h2>
      <p>The app does not request access to your camera, microphone, contacts, location, photos or any other device feature. On foldable and dual-screen devices it reads the screen's fold position so the exhibit can line up with the hinge; that information is used on the device only and is not stored.</p>

      <h2>Third parties</h2>
      <p>The web version is served from GitHub Pages, which, like any web host, may keep standard server logs (such as IP addresses and request times) under <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener noreferrer">GitHub's privacy statement</a>. We do not receive or use those logs. The App Store and Google Play versions are distributed by Apple and Google under their own policies.</p>

      <h2>Changes to this policy</h2>
      <p>If the app ever starts collecting information, this page will say so before that version is released, and the date at the top will change.</p>

      <h2>Contact</h2>
      <p>Questions about privacy: <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.</p>
    </InfoPage>
  );
}
