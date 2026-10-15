import { Hero } from "@/components/Hero";
import { Architecture } from "@/components/Architecture";
import { Playground } from "@/components/Playground";
import { FeatureBento } from "@/components/FeatureBento";
import { Models } from "@/components/Models";
import { Support } from "@/components/Support";

/**
 * Section order follows the reader's question order:
 *   Hero         What is it, how do I run it
 *   Bridge       How it works inside (the flow diagram first)
 *   Playground   What happens when I run it (real output)
 *   Features     What it does
 *   Models       Which models it can reach (real catalog)
 *   Support      The ask
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <Architecture />
      <Playground />
      <FeatureBento />
      <Models />
      <Support />
    </>
  );
}
