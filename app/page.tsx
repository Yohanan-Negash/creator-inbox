import { Space_Grotesk } from "next/font/google";
import { ArrowRight, Coins, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroScene } from "@/components/marketing/hero-scene";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-marketing-display",
});

const stripItems = [
  {
    icon: Zap,
    title: "One interface for both sides",
    copy: "Community members submit paid text requests while creators manage everything in one inbox.",
  },
  {
    icon: TrendingUp,
    title: "Clear request tracking",
    copy: "Track every request from submission to response with transparent status updates.",
  },
  {
    icon: Coins,
    title: "Payments and cashouts built in",
    copy: "Charge per request, handle refunds when needed, and cash out earnings in one place.",
  },
] as const;

const fadeUp = (delayMs: number) =>
  ({
    style: {
      animation: `marketing-fade-up 600ms ease-out ${delayMs}ms both`,
    },
  }) as const;

export default function Page() {
  return (
    <main
      className={`${displayFont.variable} relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[#020b10] text-white`}
    >
      <HeroScene />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-5 px-6 text-center">
        <p
          className="inline-block border border-primary/35 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary"
          {...fadeUp(0)}
        >
          Built for Whop creators
        </p>

        <h1
          className="max-w-3xl text-4xl leading-[1.02] text-white sm:text-5xl md:text-6xl"
          style={{
            fontFamily: "var(--font-marketing-display), var(--font-geist-sans), sans-serif",
            ...fadeUp(80).style,
          }}
        >
          Paid message requests, made simple.
        </h1>

        <p
          className="max-w-2xl text-base text-cyan-50/76 sm:text-lg"
          {...fadeUp(160)}
        >
          Creator Inbox gives Whop creators and their communities a simple paid messaging workflow: submit requests, track status end to end, and manage responses without messy DM operations.
        </p>

        <div
          className="flex flex-wrap items-center justify-center gap-3"
          {...fadeUp(240)}
        >
          <Button
            type="button"
            size="lg"
            disabled
            className="border-primary/60 bg-primary/90 px-5 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-90"
          >
            <span className="inline-flex items-center gap-1.5">
              Launching for Whop creators
            </span>
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>

      <div
        className="relative z-10 mt-10 w-full max-w-5xl px-6"
        {...fadeUp(360)}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {stripItems.map((item, index) => (
            <article
              key={item.title}
              className="border border-cyan-100/14 bg-[#020b10]/70 px-4 py-3 text-left backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_16px_rgba(108,220,232,0.15)]"
            >
              <span
                className="inline-flex"
                style={{ animation: `marketing-icon-float 3.4s ease-in-out ${index * 180}ms infinite` }}
              >
                <item.icon className="size-4 text-primary" />
              </span>
              <h2 className="mt-1.5 text-sm font-semibold text-cyan-50">{item.title}</h2>
              <p className="mt-0.5 text-xs text-cyan-100/68">{item.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
