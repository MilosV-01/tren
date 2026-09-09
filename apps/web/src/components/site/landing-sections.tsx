import Link from 'next/link';
import { AUDIENCE, FAQ, FEATURES, HERO_EYEBROW, HOW_IT_WORKS, PRICING, STATS } from '@/lib/marketing';
import { Icon } from './icons';
import { LogoMark } from './logo';

function Section({
  id,
  className = '',
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-5 py-16 sm:py-24 ${className}`}>
      {children}
    </section>
  );
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
        {title}
      </h2>
      {lead && <p className="mt-4 text-lg text-surface-600">{lead}</p>}
    </div>
  );
}

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[420px] bg-gradient-to-b from-primary-100/70 to-transparent blur-2xl"
      />
      <Section className="relative grid items-center gap-12 lg:grid-cols-2 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            {HERO_EYEBROW}
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-surface-900 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
            Sve fotografije sa vašeg događaja, na jednom mestu
          </h1>
          <p className="mt-5 max-w-xl text-lg text-surface-600">
            Gosti skeniraju QR kod sa stola, upišu ime i šalju fotografije i video direktno u
            zajedničku galeriju. Bez instalacije aplikacije, bez pravljenja naloga.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className="btn-primary">
              Napravi događaj besplatno
            </Link>
            <a href="#kako-radi" className="btn-secondary">
              Pogledaj kako radi
            </a>
          </div>
          <p className="mt-4 text-sm text-surface-500">
            Bez kartice · QR kod za 30 sekundi · Otkažeš kad hoćeš
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
          <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-2xl shadow-primary-200/50">
            <img
              src="/hero.jpg"
              width={1400}
              height={933}
              alt="Gosti na venčanju dele fotografije"
              className="aspect-[4/3] w-full object-cover"
              fetchPriority="high"
            />
          </div>

          {/* floating live-gallery chip */}
          <div className="absolute -right-3 top-6 flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-xs font-medium text-surface-800 shadow-lg backdrop-blur sm:-right-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-600" />
            </span>
            Galerija uživo · 128 fotografija
          </div>

          {/* floating upload card */}
          <div className="absolute -bottom-6 -left-3 w-60 rounded-2xl border border-surface-100 bg-white p-3.5 shadow-xl sm:-left-8">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
                <LogoMark className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-surface-900">Šaljem 3 fotografije…</p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                  <div className="h-full w-2/3 rounded-full bg-primary-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

export function Stats() {
  return (
    <div className="border-y border-surface-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-semibold text-surface-900">{s.value}</div>
            <div className="mt-1 text-sm text-surface-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <Section id="kako-radi">
      <SectionHead
        eyebrow="Kako radi"
        title="Tri koraka do zajedničke galerije"
        lead="Od kreiranja događaja do preuzimanja svih fotografija — ceo proces traje par minuta."
      />
      <ol className="mt-14 grid gap-6 md:grid-cols-3">
        {HOW_IT_WORKS.map((s) => (
          <li key={s.step} className="card relative">
            <span className="text-sm font-semibold text-primary-600">{s.step}</span>
            <h3 className="mt-2 text-lg font-semibold text-surface-900">{s.title}</h3>
            <p className="mt-2 text-sm text-surface-600">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Features() {
  return (
    <div className="bg-white">
      <Section id="mogucnosti">
        <SectionHead
          eyebrow="Mogućnosti"
          title="Sve što treba da nijedan kadar ne ostane na tuđem telefonu"
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-surface-200 p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-600">
                <Icon name={f.icon} />
              </div>
              <h3 className="mt-4 font-semibold text-surface-900">{f.title}</h3>
              <p className="mt-2 text-sm text-surface-600">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function Audience() {
  return (
    <Section>
      <SectionHead eyebrow="Za svaki povod" title="Napravljeno za događaje koji se pamte" />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AUDIENCE.map((a) => (
          <div key={a.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-surface-200">
            <h3 className="font-semibold text-surface-900">{a.title}</h3>
            <p className="mt-2 text-sm text-surface-600">{a.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Pricing() {
  return (
    <div className="bg-white">
      <Section id="cene">
        <SectionHead
          eyebrow="Cene"
          title="Počni besplatno, nadogradi kad zatreba"
          lead="Naplata se uvodi postepeno tokom bete — do tada su svi paketi otključani za isprobavanje."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PRICING.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                plan.highlight
                  ? 'border-primary-300 bg-primary-50/40 shadow-lg shadow-primary-100'
                  : 'border-surface-200 bg-white'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-7 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-semibold text-surface-900">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-surface-900">{plan.price}</span>
                <span className="text-sm text-surface-500">{plan.priceNote}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-surface-700">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.cta.href}
                className={`mt-7 ${plan.highlight ? 'btn-primary' : 'btn-secondary'} w-full`}
              >
                {plan.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function Partners() {
  return (
    <Section id="partneri">
      <div className="overflow-hidden rounded-3xl bg-surface-900 px-8 py-14 text-surface-50 sm:px-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">
            Za sale, fotografe i wedding planere
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Ponudi Tren svojim klijentima pod sopstvenim brendom
          </h2>
          <p className="mt-4 text-surface-300">
            White-label sloj: tvoje boje i logo, više događaja pod jednim nalogom, nalozi za tim i
            objedinjeno fakturisanje. Idealno kao dodatna usluga uz tvoj paket.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register?plan=partner" className="btn-primary">
              Zakaži razgovor
            </Link>
            <a
              href="/#faq"
              className="btn-secondary border-surface-700 bg-transparent text-surface-100 hover:bg-surface-800"
            >
              Više o partnerstvu
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Faq() {
  return (
    <div className="bg-white">
      <Section id="faq">
        <SectionHead eyebrow="Pitanja" title="Česta pitanja" />
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-surface-200 border-y border-surface-200">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-surface-900">
                {item.q}
                <span className="shrink-0 text-xl leading-none text-primary-600 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-surface-600">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function FinalCta() {
  return (
    <Section className="text-center">
      <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
        Sledeći događaj zaslužuje sve fotografije, ne samo one sa jednog telefona
      </h2>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/register" className="btn-primary">
          Napravi događaj besplatno
        </Link>
        <Link href="/login" className="btn-secondary">
          Prijava za organizatore
        </Link>
      </div>
    </Section>
  );
}
