import { Nav } from "@/features/marketing/nav";
import { Hero } from "@/features/marketing/hero";
import {
  TrustMarquee,
  HowItWorks,
  Features,
  Stats,
  CTA,
} from "@/features/marketing/sections";

export const metadata = {
  title: "ClaimFlow — Receipt to reimbursement, automated",
  description:
    "AI-powered claims & reimbursement for Singapore SMEs. OCR capture, AI autofill, IRAS policy validation, approval routing, and GIRO/PayNow payout — with a full audit trail.",
};

export default function HomePage() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <TrustMarquee />
      <HowItWorks />
      <Features />
      <Stats />
      <CTA />
    </main>
  );
}
