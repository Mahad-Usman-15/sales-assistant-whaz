# Design System: thewhaz

A comprehensive visual and typographic blueprint tailored for digital asset production, social media carousels (LinkedIn & Instagram), and modern professional interfaces.

---

## 1. Brand Identity & Purpose
**thewhaz** is a solution-oriented consulting and professional growth platform built to assist students, creators, freelancers, and early-stage founders. The design system reflects this mission by combining high-contrast tech professionalism with clean, accessible layouts.

---

## 2. Color Palette

### Primary Colors
*   **Deep Charcoal / Off-Black**
    *   **Hex:** `#111111` and `#0a0436`
    *   **Usage:** Primary theme backgrounds, deep high-contrast text overlays, and dark-mode carousel blocks.
*   **Stark White**
    *   **Hex:** `#FFFFFF`
    *   **Usage:** High-readability body text on dark layouts, primary background for document cards, and light-mode sections.

### Accent & Highlight Colors
*   **Cyber Yellow / Bright Gold**
    *   **Hex:** `#FFD700` (or vibrant `#F3C623`)
    *   **Usage:** Highlighting core action terms, framing structural boundaries, and setting visual callouts (e.g., "CareerLaunch", "VentureBlueprint"). **Not used on the letterhead** (see §5) — the letterhead is a deliberately monochrome dark/white/gray application; do not introduce gold accents there without a separate brand decision.
*   **Muted Steel Gray**
    *   **Hex:** `#666666`
    *   **Usage:** Secondary text, sub-labels, and metadata formatting.

---

## 3. Typography & Hierarchy

The typographic hierarchy utilizes geometric and clean humanistic sans-serif font pairings optimized for absolute legibility on digital screens and mobile interfaces.

### Core Font Pairings
*   **Primary Headings (Display & H1/H2):** **Montserrat** / **Inter** (Bold or Black weight)
*   **Body Text & Lists:** **Inter** / **Open Sans** (Regular or Medium weight)

### Scale & Hierarchy Guidelines
*   **H1 (Hero Titles / Carousel Cover):** `24pt` - `28pt` | Line Height: `1.2` | Bold/Black
*   **H2 (Section Subheadings):** `16pt` - `18pt` | Line Height: `1.3` | Semi-Bold
*   **Body Text (Paragraphs & Grids):** `11pt` - `12pt` | Line Height: `1.5` | Regular
*   **Captions / Metatags:** `9pt` - `10pt` | Line Height: `1.4` | Regular / Muted Gray

---

## 4. Visual Assets & Layout Strategy

*   **Slide Structure:** Consistent use of multi-slide grid blocks designed for cross-platform swiping (LinkedIn Document Carousels & Instagram Square/Portrait grids).
*   **Minimalist Interface:** Clean linear alignments with structured, box-based layouts. Avoids heavy parallax shifts or dense terminal-style code containers.
*   **Iconography:** Minimal flat-line icons representing distinct tracks:
    *   💼 *Career Track* (CV Optimization & Profile Improvement)
    *   🚀 *Business Track* (Idea Validation & Growth Planning)
    *   🧩 *Decisions Track* (Goal Clarity & Action Blueprints)

---

## 5. Letterhead / Proposal Document Application

This section documents the print/PDF letterhead chrome as actually built (`docs/letterhead-skeleton.jpeg`, `docs/reference-letter-head.pdf`), which previously had no entry in this design system — sections 1-4 above only covered social-carousel assets. The letterhead is the ground-truth reference for the proposal generator; treat it as authoritative and keep this section in sync with it, not the other way around.

*   **Header band (top):** Dark gradient bar transitioning `#111111` → `#0a0436` left-to-right, with a downward-angled diagonal cut on its lower edge (not a straight rule) leading into the white body.
    *   Left zone: "WHAZ" wordmark in white, bold geometric sans (Montserrat Black), with a small star glyph accent beside the logotype.
    *   Center zone, separated from the logo by a thin vertical divider rule: two-line label stack — "AI + HUMAN MIND SYSTEM" (tracked-out caps, Captions scale ~9-10pt) over "Better Decisions. Real Growth." (muted gray, same caption scale).
    *   Right zone, separated by another vertical divider: contact block — an email row (envelope icon + `whazpk@gmail.com`) above a social-icons row (circular white icon chips for Instagram, LinkedIn, X/Twitter) + `/thewhaz` handle.
*   **Body (white, `#FFFFFF`):** Contains the dynamic proposal content. A large, low-opacity gray watermark (a stylized "Z" behind a diagonal arrow and a four-point starburst) sits in the lower-right of the body — decorative only, must never sit under or collide with body text/service lists.
*   **Footer band (bottom):** Mirrors the header's `#111111`/`#0a0436` dark gradient with the same diagonal-cut edge (angled upward this time, on its top edge). Contains a small star glyph, the tagline row "CLARITY. STRATEGY. EXECUTION. RESULTS." (tracked caps) with a supporting two-line muted-gray sub-line beneath it, and a dot-grid texture pattern in the far bottom-right corner.
*   **Palette note:** the letterhead uses only Primary Colors (`#111111`, `#0a0436`, `#FFFFFF`) plus Muted Steel Gray (`#666666`) for secondary text — confirming the accent gold is intentionally absent here (see §2 note above).
*   **Implementation guidance:** per `projectplan.md` §9, the header and footer bands (including the diagonal cuts, watermark, and dot-grid) should be treated as pre-exported high-resolution image assets rather than recreated in CSS/SVG, since they are hand-designed graphics, not simple geometric shapes.