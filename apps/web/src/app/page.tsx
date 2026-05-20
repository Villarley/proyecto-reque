import Link from "next/link";
import { Button, Card } from "@stellar-orbit/ui";

const features = [
  {
    icon: "🏆",
    title: "Reputation System",
    description:
      "Earn points for events, contributions and referrals. Level up from Explorer to Ecosystem Leader.",
  },
  {
    icon: "📍",
    title: "Event Check-ins",
    description:
      "QR-based attendance tracking for ambassador meetups and community events.",
  },
  {
    icon: "🌐",
    title: "Global Network",
    description: "Connect with Stellar ambassadors across chapters worldwide.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-20 px-6 py-20">
      {/* Hero */}
      <section className="flex w-full flex-col items-center justify-center text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(29,184,198,0.3)] bg-orbit-surface/80 px-4 py-2 text-xs font-medium tracking-wide text-white/90 backdrop-blur-md">
          <span
            className="size-2 shrink-0 rounded-full bg-orbit-stellar shadow-[0_0_10px_rgba(29,184,198,0.6)]"
            aria-hidden
          />
          Blockchain Ambassador Foundation
        </div>

        <h1 className="gradient-text text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          Stellar Orbit
        </h1>

        <p className="mt-6 max-w-xl text-lg text-white/70 sm:text-xl">
          Track progress, reputation, events and rewards for Stellar ambassadors — powered by your
          wallet.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild variant="primary">
            <Link href="/login">Connect Wallet</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-4xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-xl border border-orbit-border bg-orbit-raised text-2xl backdrop-blur-sm">
                <span aria-hidden>{feature.icon}</span>
              </div>
              <h2 className="text-base font-semibold text-white">{feature.title}</h2>
              <p className="text-sm text-white/60">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
