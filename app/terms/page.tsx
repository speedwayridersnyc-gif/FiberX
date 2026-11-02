import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Terms of Use — ${SITE.name}`, description: `The terms that apply when you use the ${SITE.name} website and apps.` };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Use" kicker="Silicon Hall" updated={SITE.policiesUpdated}>
      <p className="info-lede">These terms apply to the {SITE.name} website and to the {SITE.name} apps for iOS and Android (together, "the app"), published by {SITE.publisher}. By using the app you agree to them. They are short, because the app is simple.</p>

      <h2>1. What the app is</h2>
      <p>{SITE.name} is an interactive museum of retro computers. Each exhibit is an original re-creation, built from scratch, of what it was like to use a classic machine. The app is provided for entertainment and education. It is free, has no ads and no in-app purchases, and requires no account.</p>

      <h2>2. Using the app</h2>
      <p>You may use the app for personal, non-commercial purposes. You agree not to misuse it, to attempt to interfere with how it works, or to use it in a way that breaks any law. Any documents you write or files you "print" inside an exhibit are yours.</p>

      <h2>3. Our content</h2>
      <p>The artwork, software, exhibit designs, games, text and the {SITE.name} name and mark in the app are original works owned by {SITE.publisher} and are protected by copyright and other laws. You may not copy, redistribute, sell or create derivative works from them without written permission, except as allowed by law.</p>

      <h2>4. Trademarks of others</h2>
      <p>The exhibits are named after the real computers they recreate so that visitors know what they are looking at. Macintosh, iMac, iBook, PowerBook, Commodore, Amiga, Atari, IBM, ThinkPad, Windows and all other product names are trademarks of their respective owners. {SITE.name} is an independent project and is not affiliated with, sponsored by or endorsed by Apple, Commodore, Atari, IBM, Lenovo, Microsoft or any other manufacturer. No original software, firmware, ROMs or artwork from those companies is included.</p>

      <h2>5. No warranty</h2>
      <p>The app is provided "as is" and "as available", without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose and non-infringement. We do not promise that it will be error-free or always available, or that progress stored on your device will never be lost.</p>

      <h2>6. Limitation of liability</h2>
      <p>To the fullest extent permitted by law, {SITE.publisher} will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of data, arising out of or related to your use of the app. Where liability cannot be excluded, it is limited to the amount you paid to use the app, which is nothing.</p>

      <h2>7. Changes</h2>
      <p>We may update the app and these terms from time to time. The date at the top shows when the terms last changed. Continuing to use the app after a change means you accept the new terms.</p>

      <h2>8. App stores</h2>
      <p>If you downloaded the app from the Apple App Store or Google Play, the store's own terms also apply to the download. Apple and Google are not parties to these terms and are not responsible for the app or for support.</p>

      <h2>9. Governing law</h2>
      <p>These terms are governed by the laws of {SITE.jurisdiction}, without regard to conflict-of-law rules.</p>

      <h2>10. Contact</h2>
      <p>Questions about these terms: <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.</p>
    </InfoPage>
  );
}
