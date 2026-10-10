import { ArrowRight, Ban, HelpCircle, ClipboardList, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from './ui/Primitives';

interface LandingProps {
  onIdentify: () => void;
  onTriage: () => void;
  onGovernment: () => void;
}

/** Kept from the existing copy. WHO burden figures attributed, not invented. */
const PROBLEMS = [
  {
    icon: HelpCircle,
    title: 'Reading the snake wrong',
    body: 'Bystanders and patients struggle to tell a venomous snake from a harmless one. The result is either panic or an under-reacted bite.',
  },
  {
    icon: Ban,
    title: 'First aid that causes harm',
    body: 'Tourniquets and traditional cutting or suction worsen local tissue damage before any trained help arrives.',
  },
  {
    icon: ClipboardList,
    title: 'No record at the clinic door',
    body: 'Patients reach the health facility without the species, the swelling timeline, or what was already done to the limb.',
  },
];

const WORKFLOW = [
  {
    num: '01',
    title: 'Capture',
    body: 'Photograph the snake with the camera or pick an image from the device.',
  },
  {
    num: '02',
    title: 'Identify',
    body: 'The model runs on the device, filters candidates against your location, and reports a ranked list.',
  },
  {
    num: '03',
    title: 'Assess',
    body: 'Answer short questions about the bite, the limb, and any whole-body symptoms.',
  },
  {
    num: '04',
    title: 'Understand',
    body: 'Read the risk grade, the reasoning behind it, and the handling steps that follow.',
  },
  {
    num: '05',
    title: 'Monitor',
    body: 'Log the wound over time and keep the record for the clinic handover.',
  },
];

const DEVELOPMENT_PLAN = [
  {
    phase: 'Research',
    body: 'Field interviews with patients and health workers, and a review of WHO handling guidance for snakebite.',
  },
  {
    phase: 'Prototype',
    body: 'An offline-first build that runs identification and triage on a low-resource Android device.',
  },
  {
    phase: 'AI development',
    body: 'Detection, image embedding, and the location filter that narrows candidates to species recorded nearby.',
  },
  {
    phase: 'Clinical evaluation',
    body: 'Structured review of assessment output by clinical advisors before any wider use.',
  },
  {
    phase: 'Pilot deployment',
    body: 'Deployment in high-risk districts with a local health service partner.',
  },
  {
    phase: 'Scaling',
    body: 'Extension to further provinces and integration with national surveillance reporting.',
  },
];

const TEAM = [
  { name: 'Haidar Ali Laudza', field: 'Informatics', role: 'Project lead, AI engineering' },
  { name: 'Julius Tegar Aji Putra', field: 'Informatics', role: 'AI engineering, mobile application' },
  { name: 'Muhammad Fikri', field: 'Informatics', role: 'Backend, systems integration' },
  { name: 'Cahya Mutiara Sandi', field: 'Nursing', role: 'Clinical advisor, domain expert' },
  { name: 'Elizabet Febriani', field: 'Nursing', role: 'Clinical advisor, domain expert' },
];

const COLLABORATORS = [
  { name: 'Universitas Diponegoro', note: 'Semarang, Indonesia', logo: '/universitas_diponegoro.png' },
  { name: 'Harvard T.H. Chan School of Public Health', note: 'School of Public Health', logo: '/harvard.png' },
  { name: 'Health Systems Innovation Lab', note: 'Harvard University', logo: '/health_system.png' },
  { name: 'AI for Smart-X', note: 'Research collaboration', logo: '/aisx.png' },
  { name: 'PATH', note: 'Global health', logo: '/path.png' },
];

// Reference species photos from the public S3 bucket, cycled through the
// 3D hero card carousel every 3 seconds.
const HERO_IMAGES = [
  {
    src: 'https://br-jolly-bird-b5k243m5.storage.c-7.us-east-2.aws.neon.tech/snake-image/reference/Acanthophis_laevis/Acanthophis_laevis_obs121339246_photo205315764.webp',
    species: 'Acanthophis laevis',
    note: 'Smooth-scaled death adder. One entry in the reference set.',
  },
  {
    src: 'https://br-jolly-bird-b5k243m5.storage.c-7.us-east-2.aws.neon.tech/snake-image/reference/Ahaetulla_prasina/Ahaetulla_prasina_0003.webp',
    species: 'Ahaetulla prasina',
    note: 'Oriental whip snake. Recorded across Java and Sumatra.',
  },
  {
    src: 'https://br-jolly-bird-b5k243m5.storage.c-7.us-east-2.aws.neon.tech/snake-image/reference/Ahaetulla_fasciolata/Ahaetulla_fasciolata_obs202932892_photo358471931.webp',
    species: 'Ahaetulla fasciolata',
    note: 'Speckled-headed vine snake. Reference set entry.',
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
}

/**
 * 3D card carousel: three reference photographs tilted in perspective, the
 * active one facing forward, the others fanned behind it. Advances every 3 s;
 * a dot click restarts the timer at the chosen card.
 */
function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [intervalId, setIntervalId] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  function selectCard(index: number) {
    setActive(index);
    if (intervalId !== null) window.clearInterval(intervalId);
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3000);
    setIntervalId(id);
  }

  const activeImg = HERO_IMAGES[active];

  return (
    <div role="group" aria-label="Reference species photographs">
      <div className="relative h-52 w-64 sm:h-60 sm:w-72" style={{ perspective: '900px' }}>
        {HERO_IMAGES.map((img, i) => {
          // offset is -1, 0, or 1 around the active index (wrap-aware)
          let offset = i - active;
          if (offset > HERO_IMAGES.length / 2) offset -= HERO_IMAGES.length;
          if (offset < -HERO_IMAGES.length / 2) offset += HERO_IMAGES.length;
          const isActive = offset === 0;
          return (
            <figure
              key={img.src}
              className="card absolute inset-0 overflow-hidden"
              style={{
                transform: `translateZ(${isActive ? 60 : -40}px) rotateY(${offset * 18}deg) scale(${isActive ? 1 : 0.92})`,
                transition: 'transform 0.6s ease, opacity 0.6s ease',
                opacity: isActive ? 1 : 0.45,
                zIndex: isActive ? 20 : 10,
                transformStyle: 'preserve-3d',
              }}
            >
              <img
                src={img.src}
                alt={isActive ? `${img.species}. ${img.note}` : ''}
                className="h-full w-full object-cover"
                loading={isActive ? 'eager' : 'lazy'}
              />
              {isActive && (
                <figcaption className="absolute inset-x-0 bottom-0 border-t border-line bg-surface/85 px-4 py-3.5 backdrop-blur-sm">
                  <p className="text-[15px] font-semibold text-ink">{img.species}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-secondary">{img.note}</p>
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist" aria-label="Carousel controls">
        {HERO_IMAGES.map((img, i) => (
          <button
            key={img.src}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Show ${img.species}`}
            onClick={() => selectCard(i)}
            className={`h-2 w-2 rounded-full transition-colors ${i === active ? 'bg-brand' : 'bg-line-control'}`}
          />
        ))}
      </div>
      <p className="sr-only">
        Currently showing {activeImg.species}. The carousel advances to the next reference photograph every
        three seconds.
      </p>
    </div>
  );
}

export default function Landing({ onIdentify, onTriage, onGovernment }: LandingProps) {
  return (
    <div className="bg-canvas">
      <nav
        aria-label="Sections"
        className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#top" className="flex min-h-[44px] items-center gap-2.5" aria-label="SnakeBiteAI, back to top">
            <img src="/Logo_1.webp" alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
            <span className="text-[15px] font-semibold tracking-tight">SnakeBiteAI</span>
          </a>

          {/* The old section-anchor nav (The problem / How it works / Development
              plan / Team) is replaced by the two tool entry points; sign in and
              register are disabled for now, so Demo Dashboard takes the primary
              button slot. */}
          <div className="hidden items-center gap-6 lg:flex">
            <button
              type="button"
              onClick={onIdentify}
              className="flex min-h-[44px] items-center text-sm font-medium text-ink-secondary hover:text-ink"
            >
              Identify a Snake
            </button>
            <button
              type="button"
              onClick={onTriage}
              className="flex min-h-[44px] items-center text-sm font-medium text-ink-secondary hover:text-ink"
            >
              Start Triage Assessment
            </button>
          </div>

          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={onIdentify}
              className="btn btn-secondary px-3.5 text-[13px] lg:hidden"
            >
              Identify
            </button>
            <button type="button" onClick={onGovernment} className="btn btn-primary px-3.5 text-[13px]">
              Demo Dashboard
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      <header id="top" className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        <div className="md:grid md:grid-cols-12 md:items-center md:gap-12">
          <div className="md:col-span-7">
            <p className="overline">SnakeBiteAI</p>
            <h1 className="mt-3 text-[34px] font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[56px]">
              When minutes matter,
              <br />
              SnakeBiteAI delivers clarity.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-secondary">
              AI-assisted snake identification, triage assessment, and geographic insight. Everything below runs
              on the device, so it keeps working with no connection.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onIdentify} className="btn btn-primary">
                Identify a Snake
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={onTriage} className="btn btn-secondary">
                Start Triage Assessment
              </button>
            </div>
            <p className="mt-3 text-[13px] text-ink-muted">
              No account needed to start an assessment.
            </p>
          </div>

          {/* 3D reference-specimen carousel: real photographs from the reference
              set, rotating every 3 seconds, replacing the single static shot. */}
          <div className="mt-10 md:col-span-5 md:mt-0">
            <HeroCarousel />
          </div>
        </div>
      </header>

      <section id="problem" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="overline text-brand">The problem</p>
          <h2 className="mt-2.5 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">
            Snakebite stays time-sensitive long before a patient reaches hospital.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-secondary">
            WHO classifies snakebite envenoming as a neglected tropical disease. It causes an estimated 81,000 to
            138,000 deaths a year, with up to 400,000 people left permanently disabled. Most of those are in rural
            populations far from a clinic that can help.
          </p>

          <div className="mt-10 border-t border-line">
            {PROBLEMS.map((problem, index) => (
              <div
                key={problem.title}
                className="grid gap-2 border-b border-line py-5 sm:grid-cols-12 sm:gap-8"
              >
                <div className="flex items-start gap-3 sm:col-span-4">
                  <span className="num mt-0.5 flex-none text-[13px] font-semibold text-ink-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <problem.icon className="mt-0.5 h-5 w-5 flex-none text-brand" aria-hidden="true" />
                  <h3 className="text-[15px] font-semibold leading-snug text-ink">{problem.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-ink-secondary sm:col-span-8">{problem.body}</p>
              </div>
            ))}
          </div>

          <Card className="mt-10 p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="overline text-brand">Indonesia</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
                  Indonesia records an estimated 135,000 snakebite cases and 10,547 deaths each year, which is
                  roughly 97% of snakebite deaths across ASEAN.
                </p>
              </div>
              <p className="num shrink-0 text-5xl font-bold leading-none text-brand">97%</p>
            </div>
          </Card>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="overline text-brand">Product workflow</p>
        <h2 className="mt-2.5 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">
          Five steps, none of which need a network.
        </h2>

        {/* A connected chain rather than five identical cards: each step names
            what it does, and the connector shows the order. */}
        <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {WORKFLOW.map((step) => (
            <li key={step.num} className="bg-surface px-4 py-5">
              <p className="num text-[13px] font-semibold text-brand">{step.num}</p>
              <h3 className="mt-2 text-[15px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="plan" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="overline text-brand">Development plan</p>
            <h2 className="mt-2.5 text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">
              From field research to national scale
            </h2>
          </div>

          <ol className="mt-10">
            {DEVELOPMENT_PLAN.map((item, index) => (
              <li key={item.phase} className="grid gap-1.5 border-t border-line py-5 sm:grid-cols-12 sm:gap-8">
                <div className="flex items-baseline gap-3 sm:col-span-4">
                  <span className="num text-[13px] font-semibold text-ink-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-[15px] font-semibold text-ink">{item.phase}</h3>
                </div>
                <p className="text-sm leading-relaxed text-ink-secondary sm:col-span-8">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="team" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="overline text-brand">Team</p>
          <h2 className="mt-2.5 text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">
            Informatics and nursing, working on one workflow
          </h2>
        </div>

        {/* No portrait photography is available, so each member is marked by a
            monogram rather than an invented face. */}
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {TEAM.map((member) => (
            <li key={member.name} className="flex items-center gap-4 py-4">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-surface-secondary text-[13px] font-semibold text-ink-secondary"
              >
                {initials(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{member.name}</p>
                <p className="text-[13px] text-ink-muted">{member.field}</p>
              </div>
              <p className="hidden max-w-[16rem] text-right text-[13px] leading-snug text-ink-secondary sm:block">
                {member.role}
              </p>
              <p className="text-[13px] text-ink-secondary sm:hidden">{member.role}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="collaborators" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <p className="overline">Global health system and academic collaborators</p>
          <ul className="mt-6 flex flex-wrap gap-x-10 gap-y-6">
            {COLLABORATORS.map((org) => (
              <li key={org.name} className="flex items-center gap-3">
                <img
                  src={org.logo}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 flex-none rounded-md object-contain"
                />
                <div>
                  <p className="text-sm font-semibold text-ink">{org.name}</p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">{org.note}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-3xl text-[13px] leading-relaxed text-ink-secondary">
            These organisations are named as part of the team&apos;s support and reference network from the HSIL
            Hackathon 2026 in Bandung. Listing them here is not a statement of formal partnership or endorsement.
          </p>
        </div>
      </section>

      <footer className="on-dark border-t border-brand-800 bg-brand-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="max-w-md">
            <p className="text-[15px] font-semibold">SnakeBiteAI</p>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-200">
              An assistive tool. It does not replace clinical judgement, and identification results are never a
              certainty. When in doubt, treat the bite as an emergency.
            </p>
          </div>
          <div className="flex flex-col">
            <p className="overline text-brand-300">In this build</p>
            <button
              type="button"
              onClick={onIdentify}
              className="flex min-h-[44px] items-center text-left text-[13px] font-medium text-white hover:underline"
            >
              Identify a Snake
            </button>
            <button
              type="button"
              onClick={onTriage}
              className="flex min-h-[44px] items-center text-left text-[13px] font-medium text-white hover:underline"
            >
              Start Triage Assessment
            </button>
            <button
              type="button"
              onClick={onGovernment}
              className="flex min-h-[44px] items-center text-left text-[13px] font-medium text-white hover:underline"
            >
              Demo Dashboard
            </button>
          </div>
        </div>
        <div className="border-t border-brand-800">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <p className="text-[13px] text-brand-200">SnakeBiteAI research prototype, 2026.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}