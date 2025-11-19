import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/button";
import { PageTitle } from "../components/PageTitle";
import { WhyWrenWidget } from "../components/WhyWrenWidget";
import { GalleryGrid } from "../components/GalleryGrid";

export default function HomeLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <PageTitle
          title="Freddie Robinson"
          tagline="Renovation logbook"
          description="A personal notebook of renovations, budgets, and lessons learned that eventually became Wren—the renovation assistant."
        />

        <section className="text-center space-y-6">
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Every large project started as a stack of voice notes, sketches, and spreadsheets scattered across
            apps. I built this space to document my home and then turned those learnings into Wren so you can
            shortcut the overwhelm and focus on designing rooms that feel lived-in from day one.
          </p>
          <Button asChild size="lg" className="gap-3 font-semibold tracking-wide">
            <Link href="/wren">
              Meet Wren
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>

        <WhyWrenWidget />

        <GalleryGrid />
      </main>
    </div>
  );
}

