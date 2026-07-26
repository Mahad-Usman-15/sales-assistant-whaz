/**
 * The Whaz service catalog, transcribed verbatim from tools.md (FR-013, FR-002).
 *
 * tools.md is the single source of truth for name/description/tier; tests/unit/catalog.test.ts
 * asserts this constant still matches it character-for-character, so editing tools.md without
 * updating here fails the build rather than silently drifting.
 *
 * `challenge` and `benefit` are proposal copy rather than catalog data, so they live here only —
 * tools.md's format is "- Name" followed by a single description line, and extra lines would be
 * parsed as new entries.
 *
 * Register is taken from the reference document: terse noun phrases that fit one table line, not
 * sentences. Where the reference names a service directly (Build OS, Growth Engine, Venture
 * Blueprint) its exact wording is reused.
 *
 * No price field exists, by decision — v1 carries no monetary amounts anywhere (FR-015).
 */

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'paid';
  /** "Mission Challenge" column — the problem this service addresses. */
  challenge: string;
  /** "Expected Benefit" column — the outcome the client should expect. */
  benefit: string;
}

export const SERVICE_CATALOG: readonly ServiceCatalogItem[] = [
  // --- Free tools (9) ---
  {
    id: 'clarity-map',
    name: 'Clarity Map',
    description:
      'Transform your ideas into a clear visual roadmap by defining goals, priorities, and next steps.',
    tier: 'free',
    challenge: 'Unclear goals and priorities',
    benefit: 'A shared, visible roadmap',
  },
  {
    id: 'reality-check',
    name: 'Reality Check',
    description:
      'Evaluate whether your business idea is practical by analyzing market demand, competition, and feasibility.',
    tier: 'free',
    challenge: 'Untested business assumptions',
    benefit: 'Evidence before commitment',
  },
  {
    id: 'decision-filter',
    name: 'Decision Filter',
    description:
      'Compare multiple options using structured criteria to make smarter and more confident business decisions.',
    tier: 'free',
    challenge: 'Competing options without criteria',
    benefit: 'Faster, defensible decisions',
  },
  {
    id: 'skill-gap-analyzer',
    name: 'Skill Gap Analyzer',
    description:
      'Identify the skills you already have and discover the knowledge or experience needed to reach your goals.',
    tier: 'free',
    challenge: 'Unknown capability gaps',
    benefit: 'Targeted skill development',
  },
  {
    id: 'opportunity-scanner',
    name: 'Opportunity Scanner',
    description:
      'Find high-potential business opportunities based on market trends, your strengths, and customer demand.',
    tier: 'free',
    challenge: 'Effort spread over weak markets',
    benefit: 'Focus on real demand',
  },
  {
    id: 'execution-planner',
    name: 'Execution Planner',
    description:
      'Convert ideas into actionable tasks with organized timelines, priorities, milestones, and progress tracking.',
    tier: 'free',
    challenge: 'Plans that never become work',
    benefit: 'Scheduled, trackable delivery',
  },
  {
    id: 'whaz-career-launch',
    name: 'Whaz Career Launch',
    description:
      'Create a personalized career roadmap with recommendations for skills, learning paths, networking, and job opportunities.',
    tier: 'free',
    challenge: 'No structured career path',
    benefit: 'A concrete progression plan',
  },
  {
    id: 'whaz-compass',
    name: 'Whaz Compass',
    description:
      'A strategic guidance tool that helps you choose the best direction for your business or career based on your objectives.',
    tier: 'free',
    challenge: 'Shifting strategic direction',
    benefit: 'A defensible chosen direction',
  },
  {
    id: 'whaz-opportunity-finder',
    name: 'Whaz Opportunity Finder',
    description:
      'Discover business ideas, partnerships, funding opportunities, grants, and market gaps tailored to your interests and industry.',
    tier: 'free',
    challenge: 'Missed partnerships and funding',
    benefit: 'Surfaced, relevant openings',
  },

  // --- Paid tools (8) ---
  // Note: "Build OS" is missing its leading "- " bullet in tools.md, unlike every other entry.
  // It is unambiguously a service and is included (research.md R8).
  {
    id: 'build-os',
    name: 'Build OS',
    description:
      'A complete business operating system that helps you plan, organize, and manage your business with structured workflows, goals, and execution systems.',
    tier: 'paid',
    challenge: 'Multi-stakeholder initiatives',
    benefit: 'Central planning and execution',
  },
  {
    id: 'growth-engine',
    name: 'Growth Engine',
    description:
      'A data-driven growth framework that identifies opportunities, tracks performance, and generates actionable strategies to scale your business faster.',
    tier: 'paid',
    challenge: 'Scaling programs',
    benefit: 'Repeatable operational systems',
  },
  {
    id: 'pro-match-network',
    name: 'Pro Match Network',
    description:
      'Get matched with trusted professionals, partners, mentors, investors, or service providers based on your business goals and requirements.',
    tier: 'paid',
    challenge: 'Reliance on cold outreach',
    benefit: 'Direct access to vetted partners',
  },
  {
    id: 'deal-room',
    name: 'Deal Room',
    description:
      'A secure workspace for managing proposals, negotiations, contracts, due diligence, and business collaborations in one place.',
    tier: 'paid',
    challenge: 'Informal deal tracking',
    benefit: 'Auditable negotiation records',
  },
  {
    id: 'strategy-vault',
    name: 'Strategy Vault',
    description:
      'A premium library of proven business strategies, templates, playbooks, frameworks, and growth resources for entrepreneurs.',
    tier: 'paid',
    challenge: 'Every initiative starts from scratch',
    benefit: 'Proven playbooks on demand',
  },
  {
    id: 'launch-system',
    name: 'Launch System',
    description:
      'A step-by-step launch planner that guides you from idea validation to product launch with timelines, checklists, and milestones.',
    tier: 'paid',
    challenge: 'Launches slip on dependencies',
    benefit: 'Predictable launch dates',
  },
  {
    id: 'whaz-venture-blueprint',
    name: 'Whaz Venture Blueprint',
    description:
      'An AI-powered business blueprint generator that creates a customized roadmap covering business model, operations, marketing, finance, and growth.',
    tier: 'paid',
    challenge: 'Long-term impact planning',
    benefit: 'Structured execution roadmap',
  },
  {
    id: 'whaz-reality-lens',
    name: 'Whaz Reality Lens',
    description:
      'Analyze your business objectively with AI-powered insights that identify hidden risks, weaknesses, opportunities, and realistic growth potential.',
    tier: 'paid',
    challenge: 'Risks surface too late',
    benefit: 'Early visibility of weaknesses',
  },
] as const;

export const CATALOG_IDS = new Set(SERVICE_CATALOG.map((service) => service.id));

export const FREE_SERVICES = SERVICE_CATALOG.filter((s) => s.tier === 'free');
export const PAID_SERVICES = SERVICE_CATALOG.filter((s) => s.tier === 'paid');
