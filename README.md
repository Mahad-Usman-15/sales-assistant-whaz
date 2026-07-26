# Whaz Proposal Generator

An internal tool for the Whaz sales team. Fill in a short form, tick the services you're offering,
and get a finished, branded proposal PDF ready to send to the client.

It takes about a minute.

## The problem it solves

Before this, writing a client proposal meant prompting ChatGPT or Gemini by hand and hoping for the
best. Roughly **7 attempts in 10 came back unusable** — wrong branding, invented services, made-up
prices, inconsistent structure, or a layout that fell apart when you selected more services. Every
proposal needed cleaning up by hand, and no two looked quite the same.

This tool removes the guesswork. The wording, the layout, and the branding are fixed and approved
in advance. The only things that change are the client's details and which services you tick.

## How you use it

**1. Enter who it's for.** The recipient's name, their role (one or two lines), and the client
company. Today's date is filled in for you.

**2. Tick the services.** All 17 Whaz services are listed, split into free and paid. Tick as many
or as few as apply.

**3. Click Generate.** A few seconds later the PDF downloads, named after the client and the date —
for example `proposal-humanity-united-2026-07-26.pdf`.

That's the whole process. There's no login, no setup, and nothing to configure.

## What you get

A single branded PDF on the approved Whaz letterhead, laid out in this order:

- **Executive Proposal** — the title
- **Prepared for** — the recipient's name and role
- A short opening paragraph
- **A three-column table** — one row per service you ticked, showing the Mission Challenge it
  addresses, the Whaz Solution, and the Expected Benefit
- **Why Whaz** — the standing case for working with us
- **Next Step** — how the client moves forward

If you tick enough services that the proposal runs to a second page, the letterhead appears on
every page automatically and nothing gets cut off.

## What the tool promises

**Nothing is invented.** No AI writes any part of the finished document. Every word is either fixed
approved copy or something you typed in. It cannot hallucinate a service, a claim, or a number.

**No prices, ever.** Pricing stays a conversation, not a line item. It never appears in the PDF.

**Every proposal looks identical.** The same input always produces exactly the same document. Two
reps sending proposals on the same day produce output that matches to a fraction of a millimetre
against the client-approved reference.

**Nothing is stored.** Client names and details are used to build the PDF and then discarded. There
is no database, no account, and no record kept after the download finishes.

## What it deliberately doesn't do

Worth knowing so you don't go looking for it:

- **You can't edit the wording.** The prose is fixed by design — that's what makes the output
  reliable. Changes to the standing copy go through the team, not the form.
- **The service list is fixed in the tool.** Adding or renaming a service is a small code change,
  not something you can do from the screen. Managing the catalogue from an admin panel is a
  planned future step.
- **The client company name only names the file.** It doesn't appear in the body of the proposal.
- **There's no history.** Once you've downloaded a PDF, the tool has no memory of it. Keep your own
  copy.

## The service catalogue

**Free (9)** — Clarity Map · Reality Check · Decision Filter · Skill Gap Analyzer · Opportunity
Scanner · Execution Planner · Whaz Career Launch · Whaz Compass · Whaz Opportunity Finder

**Paid (8)** — Build OS · Growth Engine · Pro Match Network · Deal Room · Strategy Vault · Launch
System · Whaz Venture Blueprint · Whaz Reality Lens

Each one carries its own Mission Challenge and Expected Benefit wording, which is what fills the
table in the proposal.

## Where things stand

The tool is **built and tested**, and currently runs on a local machine. Putting it on a shared web
address so the sales team can reach it from a browser is the remaining step.

## For developers

Setup, architecture, testing, deployment, and the things that will bite you are in
**[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)**.

The wider project documents:

| Document | What it holds |
|---|---|
| `projectplan.md` | The business case and why this approach was chosen |
| `.specify/memory/constitution.md` | The binding principles the build has to honour |
| `tools.md` | The service catalogue — the source of truth |
| `design.md` | Brand colours, type, and the letterhead specification |
| `specs/001-proposal-pdf-generator/` | Full specification, plan, and task list |
