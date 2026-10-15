import { Hero } from "@/components/Hero";
import { Playground } from "@/components/Playground";
import { FeatureBento } from "@/components/FeatureBento";
import { Models } from "@/components/Models";
import { Architecture } from "@/components/Architecture";
import { Support } from "@/components/Support";

/**
 * Section order follows the reader's question order:
 *   Hero         What is it, how do I run it
 *   Playground   What happens when I run it (real output)
 *   Features     What it does
 *   Models       Which models it can reach (real catalog)
 *   Source       How it works inside, how to contribute
 *   Support      The ask
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <Playground />
      <FeatureBento />
      <Models />
      <Architecture />
      <Support />
    </>
  );
}
