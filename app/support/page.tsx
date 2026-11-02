import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: `Support — ${SITE.name}`, description: `Help with the ${SITE.name} app: controls, dual-screen mode, saved progress and how to reach us.` };

export default function SupportPage() {
  return (
    <InfoPage title="Support" kicker="Silicon Hall">
      <p className="info-lede">Stuck in an exhibit, or found something broken? Here are answers to the most common questions, and how to reach a real person.</p>

      <h2>Contact us</h2>
      <p>Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> and we will get back to you. Please tell us which exhibit you were in, what device you are using, and what happened. Screenshots help.</p>

      <h2>Frequently asked questions</h2>

      <h3>How do I switch on a machine?</h3>
      <p>Open an exhibit from the museum front page and press <strong>Power on</strong>. Some machines need a disk or cartridge inserted first; the controls under the keyboard show what is available.</p>

      <h3>How do I type?</h3>
      <p>Use the on-screen keyboard below the machine, or a physical keyboard if you have one connected. On phones, tap the keyboard icon in the top bar to use your device's own keyboard.</p>

      <h3>What is dual-screen mode?</h3>
      <p>The app is designed for foldable and dual-screen phones: the display sits on the top screen and the keyboard on the bottom one. On a single screen it works just as well; use the <strong>Single screen / Dual screen</strong> button in the top bar to switch.</p>

      <h3>How do I get back to the museum?</h3>
      <p>Press the <strong>Back to the Museum</strong> button at the top left of any exhibit or game.</p>

      <h3>What are secrets?</h3>
      <p>Every playable exhibit hides things to discover: commands to try, programs to run, Easter eggs to find. The star counter in the top bar opens the list for that machine, with hints. Found secrets are saved on your device.</p>

      <h3>Where is my progress stored? Can I reset it?</h3>
      <p>Progress is stored on your device only; nothing is sent to us. To start an exhibit over, open its secrets panel and use the reset option. Clearing the app's data or uninstalling it also erases progress.</p>

      <h3>My "printed" documents: where do they go?</h3>
      <p>Printing inside an exhibit saves an image (or a text file) to your device, the same way a download would. Look in your Downloads or Files app.</p>

      <h3>Something is not working</h3>
      <p>Try reloading the page or restarting the app first. If the problem continues, email us with the exhibit name and your device model and we will look into it.</p>

      <h2>Privacy</h2>
      <p>The app collects no personal data. Our <Link href="/privacy">privacy policy</Link> explains the small amount it keeps on your device.</p>
    </InfoPage>
  );
}
