"use client";

import Link from "next/link";
import { Button, Card } from "@stellar-orbit/ui";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

const stats = [
  { value: "5", key: "statTiers" as const },
  { value: "3", key: "statRoles" as const },
  { value: "24/7", key: "statWallet" as const },
] as const;

export default function HomePage() {
  const { t } = useI18n();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f2ea] text-orbit-text">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(8,145,178,0.18),transparent_30%),radial-gradient(circle_at_85%_5%,rgba(245,158,11,0.24),transparent_28%),linear-gradient(115deg,rgba(255,255,255,0.85),rgba(255,255,255,0)_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orbit-text/20 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/80 bg-white/70 px-4 py-3 shadow-[0_20px_80px_rgba(17,24,39,0.08)] backdrop-blur-xl">
          <BrandLogo priority imageClassName="h-8 w-auto" />
          <div className="hidden items-center gap-2 rounded-full border border-orbit-border bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orbit-text-3 sm:flex">
            <span className="size-2 rounded-full bg-orbit-stellar shadow-[0_0_18px_rgba(8,145,178,0.7)]" />
            {t.home.liveBadge}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="ghost" className="px-3 py-2 text-xs">
              <Link href="/login">{t.home.signIn}</Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-orbit-text/10 bg-white/65 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-orbit-text-2 shadow-orbit-sm backdrop-blur">
              {t.home.foundation}
            </div>

            <h1 className="max-w-4xl text-balance text-6xl font-black leading-[0.9] tracking-[-0.06em] text-orbit-text sm:text-7xl lg:text-8xl">
              {t.home.headline}
            </h1>

            <p className="mt-7 max-w-2xl text-balance text-lg leading-8 text-orbit-text-2 sm:text-xl">
              {t.home.subhead}
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="primary" className="h-12 rounded-full px-6">
                <Link href="/login">{t.home.connectWallet}</Link>
              </Button>
              <Button asChild variant="secondary" className="h-12 rounded-full px-6">
                <Link href="/dashboard">{t.home.viewDashboard}</Link>
              </Button>
            </div>

            <div className="mt-12 grid max-w-2xl grid-cols-3 overflow-hidden rounded-3xl border border-white/80 bg-white/55 shadow-orbit-sm backdrop-blur">
              {stats.map((stat) => (
                <div
                  key={stat.key}
                  className="border-r border-orbit-border/70 px-4 py-5 last:border-r-0"
                >
                  <p className="text-2xl font-black tracking-tight text-orbit-text sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-orbit-text-3">
                    {t.home[stat.key]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
            <div
              className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-orbit-stellar/20 via-white/60 to-orbit-gold/30 blur-3xl"
              aria-hidden
            />
            <Card className="relative overflow-hidden rounded-[2rem] border-white/80 bg-white/80 p-5 shadow-[0_30px_100px_rgba(17,24,39,0.16)] backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-orbit-border bg-[#101827] p-5 text-white shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">
                      {t.home.previewProfile}
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                      {t.home.previewName}
                    </h2>
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-orbit-text">
                    SO
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-white/55">{t.home.previewPoints}</p>
                      <p className="mt-1 text-4xl font-black tracking-tight">2,840</p>
                    </div>
                    <p className="rounded-full bg-orbit-gold px-3 py-1 text-xs font-black uppercase tracking-wide text-orbit-text">
                      +18%
                    </p>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-orbit-stellar to-orbit-gold" />
                  </div>
                  <p className="mt-3 text-xs font-medium text-white/50">
                    {t.home.previewToLeader}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-3xl font-black">14</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                      {t.home.previewEvents}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-3xl font-black">7</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                      {t.home.previewReferrals}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 pb-10 md:grid-cols-3">
          {t.home.features.map((feature) => (
            <Card
              key={feature.title}
              className="group relative overflow-hidden rounded-[1.5rem] border-white/80 bg-white/65 p-6 shadow-[0_18px_70px_rgba(17,24,39,0.08)] backdrop-blur transition-transform duration-200 hover:-translate-y-1"
            >
              <div
                className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-orbit-stellar/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orbit-stellar">
                {feature.eyebrow}
              </p>
              <h2 className="mt-5 text-xl font-black tracking-tight text-orbit-text">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-orbit-text-2">
                {feature.description}
              </p>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
