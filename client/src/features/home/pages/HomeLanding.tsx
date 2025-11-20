import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/button";
import { PageTitle } from "../components/PageTitle";
import { GalleryGrid } from "../components/GalleryGrid";

export default function HomeLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <PageTitle title="Hey, I'm Freddie 👋" className="text-left max-w-3xl" />

        <section className="space-y-6">
          <div className="space-y-6 text-lg text-muted-foreground max-w-3xl leading-relaxed text-left">
            <p>
              I’m a product manager at Wise who’s slightly obsessed with how people can interact with AI to make
              their life easier. I'm learning lots about conversational flows and search quirks to agentic systems.
              This site is my playground for building and learning how to develop AI assistants from scratch.​
            </p>
            <p>
              A few years ago, a full‑on house renovation chewed me up and spat me out. Mostly because I had no
              idea what I didn’t know: the hidden decisions, the trade‑offs experts make instinctively, and all
              the delightful surprise costs. So I decided to take my learnings from that chaotic experience into
              something useful and build the kind of renovation assistant I wish I’d had at the start.​
            </p>
            <p>
              Wren is that experiment, an AI renovation companion you can chat to about budgets, moodboards and
              design ideas, and where to find the right products and skills for your project. Click through, say
              hello, and see if it can make your own renovation journey a little less overwhelming and a lot more
              doable.
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              asChild
              size="lg"
              className="gap-3 font-semibold tracking-wide text-base sm:text-lg lg:text-xl lg:px-10 lg:py-5"
            >
              <Link href="/wren">
                talk to Wren
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <GalleryGrid />
    </div>
  );
}

