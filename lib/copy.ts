/**
 * Fixed proposal copy.
 *
 * Every string here is transcribed from the text layer of docs/reference-letter-head.pdf, which
 * is the approved document. These blocks are identical on every proposal — only the recipient
 * block and the selected services vary — so they are constants rather than form fields.
 *
 * The reference hard-wraps these paragraphs at fixed line breaks because ReportLab has no text
 * flow. Here they are single strings and Chromium wraps them, which is why the wrap points can
 * differ from the reference by a word while the content is identical.
 */

export const DOC_TITLE = 'Executive Proposal';

export const INTRO =
  'Organizations addressing complex global challenges require strong execution in addition ' +
  'to a compelling mission. Whaz is an AI-powered strategy and execution platform designed ' +
  'to help mission-driven organizations align teams, improve decision-making, monitor ' +
  'outcomes, and scale initiatives with greater clarity and accountability.';

export const WHY_WHAZ = {
  heading: 'Why Whaz',
  body:
    'Whaz complements mission-focused leadership by providing an execution layer that ' +
    'combines AI insights with human expertise. The platform helps organizations improve ' +
    'operational maturity, align strategic priorities, and measure progress without ' +
    'compromising their mission.',
} as const;

export const NEXT_STEP = {
  heading: 'Next Step',
  // The en dash in "20–30" is the reference's own character (WinAnsi 0x96).
  body:
    'I would welcome the opportunity to discuss how Whaz can support organizations driving ' +
    'systemic change through a brief 20–30 minute conversation.',
} as const;

export const TABLE_HEADINGS = ['Mission Challenge', 'Whaz Solution', 'Expected Benefit'] as const;
