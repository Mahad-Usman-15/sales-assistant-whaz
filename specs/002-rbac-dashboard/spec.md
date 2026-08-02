# Feature Specification: RBAC Dashboard

**Feature Branch**: `002-rbac-dashboard`
**Created**: 2026-08-01
**Status**: Draft
**Input**: User description: "RBAC dashboard"

Source requirement: `dashboard.txt` (repo root). Governing policy: `.specify/memory/constitution.md` **v4.0.0**,
which was amended on 2026-08-01 specifically to permit this feature — see Dependencies below.

## Target Audience

Everyone who uses this feature is Whaz internal staff. There are exactly two kinds of them, and they
map one-to-one onto the two roles.

| Audience | Role | What they need from this feature | What they must never see |
|---|---|---|---|
| **Sales representatives** — the primary users, and the reason the tool exists | Sales | To keep generating proposals with no new friction, and to see their own output | Anyone else's figures, the organisation-wide total, member administration |
| **Whaz leadership / whoever administers the team** | Admin | To onboard and offboard people themselves, and to see team size and total output at a glance | — (Admins see everything in scope) |

**The constraint the primary audience imposes.** The sales team is non-technical and has limited
prompt-engineering skill — the tool exists precisely because producing a proposal should not require
specialist skill. Two performance expectations carry over from the original tool and this feature
adopts them as its own: **under 2 minutes** from opening the form to holding a PDF, and **>80% team
adoption**. Both are at risk from an authentication step done carelessly. Two consequences follow,
and they are requirements, not preferences:

- **Signing in is a rare cost, never a per-proposal one.** A rep who signs in once keeps that session
  for 30 days of continued use, refreshed each time they use the tool (FR-041, SC-012). A sign-in
  prompt on every proposal — or even every morning — would consume the 2-minute budget and push the
  team back toward prompting ChatGPT out of habit, which is the failure this product exists to end.
- **No passwords** (FR-003). A team that was never meant to need specialist skill should not be
  administering credentials either, and a forgotten-password loop is exactly the kind of friction
  that ends adoption.

**Scale.** ~10–50 proposals/day across the whole team. No headcount has been stated anywhere; see
Assumption 13.

**On provenance.** The audience facts above originate in the 2026-07 MVP analysis (`projectplan.md`,
`problemstatement`). Those files are **historical records, not source of truth** — this spec restates
what remains true and owns it. Nothing in them scopes or constrains this feature; where they and this
spec disagree, this spec and the constitution win. In particular their "no login, no database, no
stored history" statements describe the MVP and were deliberately overridden by constitution v4.0.0.

**Not an audience.** Prospective clients — the recipients of proposals — never touch this tool and
have no role in it. `whaz.md`'s "Target Audience" section describes *them* (students, freelancers,
founders, young professionals) and is about Whaz's services, not about this application. The two
must not be conflated: nothing in this feature is client-facing, and the generated PDF is unchanged
by it (FR-013).

## Clarifications

### Session 2026-08-01

- Q: How long does a signed-in session last before the member must request a new sign-in link? → A: Sliding 30-day session, refreshed on each use
- Q: Should the sign-in form limit how often a link can be requested? → A: Throttle per email address (short cooldown between requests for the same address)
- Q: What accessibility bar applies, and to what? → A: WCAG 2.2 AA for the new dashboard views only; existing generator untouched
- Q: When the member store cannot be reached, what happens to proposal generation? → A: Fail closed — no generation, with a distinct "temporarily unavailable" state. No availability target is set in this spec
- Q: When an Admin restores a removed member, what role do they get? → A: The restoring Admin picks the role at restore time, defaulted to the role held when removed

### Session 2026-08-02

- Q: Whaz owns no domain (only `whazpk@gmail.com`), which rules out every email provider requiring DNS verification — how do sign-in links get sent? → A: Gmail SMTP (`smtp.gmail.com:587`) authenticating as `whazpk@gmail.com` with a Google App Password. Magic-link sign-in is unchanged; only the transport differs. Declined: buying a domain (recurring cost), and switching to Google OAuth (would have amended FR-003)

## User Scenarios & Testing *(mandatory)*

Today the proposal generator is completely open: anyone who can reach the URL can produce a
Whaz-branded client proposal, and nobody can say how many proposals the team has produced or who
produced them. This feature adds people to the product — who they are, what they are allowed to do,
and what they have done.

### User Story 1 - Only invited staff can produce Whaz-branded proposals (Priority: P1)

A Whaz team member opens the proposal tool and is asked to sign in. They enter their work email,
receive a sign-in link, follow it, and land on the generator they already know — unchanged. Someone
who has never been invited follows the same steps and is told they do not have access; they can
generate nothing.

**Why this priority**: Every other part of this feature depends on knowing who is acting. It is also
the only slice that stands alone as a complete, valuable change: a branded client-facing document
generator that anybody on the internet can drive is a brand-integrity problem today, and this closes
it. It ships without any dashboard at all.

**Independent Test**: Deploy with only sign-in enforced and no dashboard. Confirm an invited member
can sign in and generate a proposal identical to the pre-change output, and that an uninvited person
and a signed-out visitor can generate nothing by any route, including calling the generation
endpoint directly.

**Acceptance Scenarios**:

1. **Given** a visitor who is not signed in, **When** they open any page of the application,
   **Then** they are sent to the sign-in screen and no proposal can be generated.
2. **Given** an active member, **When** they request a sign-in link and follow it, **Then** they
   arrive at the proposal generator and can generate a proposal.
3. **Given** an active member, **When** they generate a proposal with a given set of inputs,
   **Then** the resulting document is identical to what the same inputs produced before this feature.
4. **Given** a person who was never invited, **When** they request a sign-in link for their address
   and follow it, **Then** they are told they do not have access and can reach no part of the tool.
5. **Given** a signed-out visitor, **When** they submit a generation request directly to the
   application rather than through the form, **Then** the request is refused and no document is
   produced.
6. **Given** a member whose access was withdrawn while they were signed in, **When** they take their
   next action, **Then** it is refused immediately — they do not keep working until their session
   would otherwise have expired.

---

### User Story 2 - An Admin manages who is on the team (Priority: P2)

An Admin opens the members area, sees everyone with their role and status, and invites a new
colleague by email — choosing whether that person joins as an Admin or as Sales. When someone leaves
the team, the Admin removes their access. The system refuses, always, to remove the last remaining
Admin.

**Why this priority**: Without this, the team is frozen at whoever existed at launch, and there is no
way to remove a departing employee's access. It is second only because it is meaningless until
people can sign in at all.

**Independent Test**: Sign in as an Admin, invite a colleague as Sales, have them accept and generate
a proposal, then change their role to Admin and back, then remove their access and confirm they are
locked out. Separately, as the only Admin, attempt to remove your own access and confirm refusal.

**Acceptance Scenarios**:

1. **Given** an Admin on the members area, **When** they view the list, **Then** they see every
   member with their email, role, status, and when they joined.
2. **Given** an Admin, **When** they invite an email address and choose a role, **Then** that person
   receives a sign-in link and, on following it, joins with exactly the role that was chosen.
3. **Given** an invited person, **When** they attempt to join with a different role than the one the
   Admin selected, **Then** they cannot — the assigned role is not something the invitee controls.
4. **Given** an outstanding invitation for an address, **When** an Admin invites that same address
   again, **Then** they are told an invitation is already outstanding and no second one is created.
5. **Given** an email address that already belongs to a member, **When** an Admin invites it,
   **Then** they are told the person is already a member and whether that member is currently
   active or inactive.
6. **Given** an invitation older than the expiry window, **When** the recipient follows the link,
   **Then** it does not grant access.
7. **Given** an Admin viewing outstanding invitations, **When** they revoke one, **Then** that link
   no longer grants access.
8. **Given** two active Admins, **When** one removes the other's access, **Then** it succeeds and the
   removed Admin is locked out on their next action.
9. **Given** exactly one active Admin, **When** anyone attempts to remove that Admin's access or
   change their role to Sales, **Then** the action is refused with a clear explanation and nothing
   changes.
10. **Given** two active Admins acting at the same moment, **When** each attempts to remove the
    other, **Then** exactly one succeeds and one is refused — the organisation is never left without
    an Admin.
11. **Given** an Admin who is not the last one, **When** they remove their own access or demote
    themselves, **Then** they are warned the change is immediate and cannot be undone by them, and on
    confirmation it takes effect.
12. **Given** a member whose access was removed, **When** an Admin restores it, **Then** the Admin is
    asked to confirm the role — pre-filled with the one held at removal — and the member can sign in
    again with that role and their previous history intact.
13. **Given** a former Admin whose access was removed, **When** an Admin restores them as Sales,
    **Then** they return with Sales permissions only; Admin is not silently reinstated.

---

### User Story 3 - Everyone sees the numbers they are entitled to (Priority: P3)

A Sales rep opens their dashboard and sees one number: how many proposals they have generated. An
Admin opens theirs and sees two: how many members are active, and how many proposals the team has
successfully produced in total. Neither sees anything the other is entitled to and they are not.

**Why this priority**: This is the visible payoff of the feature, but it is the slice that depends on
everything else — counts are only meaningful once generations are attributable and roles exist.

**Independent Test**: As a Sales member, generate three proposals and confirm the dashboard reads
three and shows nothing about anyone else. As an Admin, confirm the active-member count and the
organisation-wide total both match an independent count.

**Acceptance Scenarios**:

1. **Given** a Sales member who has generated three proposals, **When** they open their dashboard,
   **Then** it shows three, and shows no other member's figures and no organisation-wide figure.
2. **Given** a Sales member, **When** they navigate directly to any Admin view or attempt any Admin
   action, **Then** they are refused; the existence of those capabilities is not disclosed to them.
3. **Given** an Admin, **When** they open their dashboard, **Then** they see the number of active
   members and the organisation-wide total of successfully generated proposals.
4. **Given** a member who has generated nothing yet, **When** they open their dashboard, **Then**
   they see zero presented as a deliberate empty state, not a blank space or an error.
5. **Given** a dashboard that is still loading, **When** the member is waiting, **Then** they see a
   clear loading indication rather than an empty page or a jump in layout.
6. **Given** one figure on the Admin dashboard that cannot be loaded, **When** the page renders,
   **Then** that section shows a retry-able error and the rest of the dashboard still works.
7. **Given** a proposal that failed to generate, **When** counts are next viewed, **Then** it is not
   included in any total.
8. **Given** a member whose access was removed, **When** organisation-wide totals are viewed,
   **Then** the proposals they generated are still counted — removing a person does not rewrite
   history.

---

### Edge Cases

- **Last Admin, contested simultaneously.** Two Admins each remove the other at the same instant.
  Exactly one must succeed. This is the invariant most likely to be implemented in a way that looks
  correct and is not; it must be demonstrated under genuine concurrency, not argued.
- **Sole Admin hands over and leaves.** They must be able to promote a successor and then remove
  themselves — in that order. The system does not need a special case for this; the "at least one
  active Admin" rule already permits it.
- **Everyone with Admin access is locked out.** Recovery is deliberately not available inside the
  application; it is a documented manual procedure requiring provider-console credentials. An
  in-application recovery route would be the back door this feature exists to prevent.
- **The first Admin.** Before anyone exists there is nobody to issue an invitation. Creating the
  first Admin must be possible without a route that remains reachable afterwards.
- **Invitation email never arrives.** The invitee cannot act, and the Admin sees an outstanding
  invitation. The Admin must be able to revoke and re-issue.
- **Someone hammers the sign-in form.** Requests for the same address are refused after the cooldown
  without sending mail (FR-042). A member who genuinely did not receive the first email waits out the
  cooldown rather than being told the address is unknown.
- **Someone forwards their sign-in link.** Whoever follows it gains that person's access. Treated as
  equivalent to sharing a password: out of scope to prevent, in scope to bound by making links
  short-lived and single-use.
- **A member is removed mid-session.** Access ends on their next action, not when their session would
  have expired.
- **Generation succeeds but the usage record fails to save.** The member keeps the proposal; the
  total under-reports by one and the discrepancy is logged. A counter never withholds a delivered
  document.
- **Generation fails.** No usage record, and the existing failure message is unchanged.
- **The member store is unreachable.** Nobody generates anything (FR-045) — this feature makes the
  store a hard dependency of a tool that previously had none. Members see "temporarily unavailable,"
  never a generation error and never a silent success.
- **A member clicks Generate twice.** Two proposals were produced, so the count is two. This is
  correct, not a duplicate.
- **A member closes the browser mid-download.** The proposal was generated, so it counts. Accepted:
  distinguishing this would require the recipient to confirm receipt.
- **An Admin invites their own address**, or an address differing only in letter case or surrounding
  whitespace from an existing member. Treated as the same person; a second member is not created.
- **A Sales member guesses an Admin URL.** Refused without confirming that the page exists.
- **The last Admin is also the only member.** Removing them is refused, so a fully empty
  organisation cannot be created through the application.

## Requirements *(mandatory)*

### Functional Requirements

**Identity and access**

- **FR-001**: The system MUST require a signed-in, active member for every page and every action,
  including proposal generation. No capability may remain reachable anonymously.
- **FR-002**: The system MUST NOT offer self-service registration. Access MUST originate from an
  invitation issued by an Admin.
- **FR-003**: Members MUST be able to sign in without creating, remembering, or resetting a password,
  by following a single-use link sent to their work email address.
- **FR-004**: The system MUST assign every member exactly one role — **Admin** or **Sales** — and
  exactly one status — **Active** or **Inactive** — with status independent of role.
- **FR-005**: A person who reaches the application without a valid invitation MUST gain no access,
  and the attempt MUST be recorded rather than silently discarded.
- **FR-006**: The system MUST refuse every action by an Inactive member from their next action
  onward, without requiring them to sign out and without waiting for a session to lapse.
- **FR-007**: Members MUST be able to sign out, ending their session.
- **FR-041**: A session MUST remain valid for **30 days**, sliding — each use refreshes the window.
  Session length MUST NOT be used as an access-revocation mechanism; FR-006's per-action status check
  is what withdraws access, which is precisely why a long session is safe here.
- **FR-042**: Sign-in link requests MUST be throttled per email address — a short cooldown between
  consecutive requests for the same address, and a bounded number per hour. Exceeding it MUST be
  refused without sending mail. This is the only unauthenticated endpoint in the system that produces
  an outbound side effect; unbounded, it is an open email relay pointed at Whaz's sending reputation
  and it consumes the free email allowance the $0 cost ceiling depends on.
- **FR-043**: The response to a sign-in link request MUST be identical whether or not the address
  belongs to a member — same message, and no timing difference that distinguishes the two. Whether a
  person has access is disclosed only after they follow a link (FR-005, US1 scenario 4), never at
  request time, so the form cannot be used to enumerate staff. A "this address is unknown" fast path
  MUST NOT be introduced as a throttling shortcut.
- **FR-045**: When the member store cannot be reached, the system MUST **fail closed** — no proposal
  is generated and no view is served. An unreachable store MUST NEVER be treated as permission
  granted, and a cached or last-known-good authorization decision MUST NOT be used to work around it.
  The member MUST see a distinct **"temporarily unavailable — try again shortly"** state that is
  separate from validation failure and from generation failure. Reporting unavailability as a
  generation failure is a defect: it sends a diagnosis toward the rendering pipeline when the cause
  is a dependency, and it destroys the only signal that would say so.

**Authorization**

- **FR-008**: The system MUST enforce every permission at the moment the action is performed.
  Hiding, disabling, or omitting a control MUST NOT be the only thing preventing an action.
- **FR-009**: Sales members MUST NOT be able to see, by any route including direct navigation and
  direct requests: other members' identities or figures, organisation-wide totals, member
  administration, or invitations.
- **FR-010**: A member's role MUST be determined solely by what an Admin assigned. No member MUST be
  able to change their own role except an Admin using the member-administration capability, and no
  invitee MUST be able to influence the role they are granted.
- **FR-011**: A refused action MUST NOT disclose whether the requested resource exists.

**Proposal generation and usage records**

- **FR-012**: Any active member, of either role, MUST be able to generate proposals exactly as before
  this feature.
- **FR-013**: For identical inputs, the generated document MUST be identical to what the system
  produced before this feature. Adding identity MUST NOT change a single byte of output.
- **FR-014**: The system MUST record exactly one usage record for each proposal that is successfully
  generated and delivered, attributed to the member who generated it.
- **FR-015**: The system MUST NOT record a usage record for a generation that failed.
- **FR-016**: A failure to record usage MUST NOT prevent delivery of a successfully generated
  proposal; the discrepancy MUST be logged distinguishably.
- **FR-017**: The system MUST NOT store the contents of generated proposals, nor the client details
  entered to produce them. A usage record holds only who generated it and when.

**Figures**

- **FR-018**: Sales members MUST be able to see the count of proposals they personally generated, and
  no other count.
- **FR-019**: Admins MUST be able to see the number of active members and the organisation-wide total
  of successfully generated proposals.
- **FR-020**: Displayed counts MUST equal an independent count of the underlying records.
- **FR-021**: Removing or demoting a member MUST NOT alter organisation-wide historical totals.

**Invitations**

- **FR-022**: Admins MUST be able to invite a person by email address, selecting Admin or Sales at
  the time of invitation.
- **FR-023**: The role selected at invitation MUST be the role granted when the invitee first signs
  in.
- **FR-024**: The system MUST prevent more than one outstanding invitation per email address.
- **FR-025**: The system MUST refuse to invite an address that already belongs to a member, and MUST
  tell the Admin whether that member is currently active or inactive.
- **FR-026**: Invitations MUST expire after a defined period, after which the link grants no access.
- **FR-027**: Admins MUST be able to see outstanding invitations and revoke any of them.
- **FR-028**: The system MUST treat email addresses that differ only in letter case or surrounding
  whitespace as the same person.
- **FR-029**: The system MUST retain who invited each member and when they joined.

**Member administration**

- **FR-030**: Admins MUST be able to change any member's role between Admin and Sales.
- **FR-031**: Admins MUST be able to remove any member's access.
- **FR-032**: Removal MUST be reversible: an Admin MUST be able to restore a removed member, who
  regains access with their history intact. The restoring Admin MUST choose the role at restore time,
  **defaulted to the role the member held when removed**. Restoring MUST NOT re-grant Admin
  implicitly — a role is always something an Admin actively assigns (FR-010, FR-022), and restore is
  otherwise the only path by which a privilege could appear as a side effect of a different decision.
- **FR-033**: **At least one active Admin MUST exist at all times.** Any action that would leave zero
  active Admins MUST be refused with a clear explanation. This MUST hold when multiple Admins act
  simultaneously, not only when they act one at a time.
- **FR-034**: An Admin MUST be able to remove or demote themselves provided at least one other active
  Admin remains, and MUST be warned before confirming that the change is immediate and that they
  cannot reverse it themselves.
- **FR-035**: Destructive administrative actions MUST require an explicit confirmation that states
  what will happen.
- **FR-036**: The system MUST provide a way to create the first Admin that is not reachable by anyone
  using the deployed application, and that stops working once an active Admin exists.

**Presentation**

- **FR-037**: Every dashboard view MUST have a distinct loading state, a distinct empty state, and a
  distinct error state offering a retry. A blank region MUST NOT be used for any of the three.
- **FR-038**: Failure of one section of a dashboard MUST NOT prevent the rest of it from working.
- **FR-039**: The dashboard MUST use the application's existing visual identity.
- **FR-040**: Introducing the dashboard MUST NOT change the appearance of the existing proposal
  generator.
- **FR-044**: The new sign-in and dashboard views MUST meet **WCAG 2.2 Level AA**. Binding
  consequences: every control is reachable and operable by keyboard alone; focus is visible at all
  times and is trapped inside modal dialogs and returned to the trigger on close; every control,
  table column, and status indicator has an accessible name; state is never conveyed by colour alone
  (a role or status badge carries text, not just a hue); loading and error states are announced, not
  only shown; and text and interactive elements meet AA contrast. This applies to views this feature
  introduces — it does **not** extend to the existing proposal generator (see FR-040 and Out of scope).

### Key Entities

- **Member**: A person with access to the tool. Holds their email address (their identity), their
  role (Admin or Sales), their status (Active or Inactive), when they joined, and who invited them.
  The role persists through removal so that restore can default to it (FR-032); an Inactive member
  still has a role, it simply grants nothing while they are Inactive.
  Exists so that role, status, and history have something stable to attach to — an authentication
  record alone cannot carry them.
- **Invitation**: A pending grant of access to an email address, carrying the role an Admin chose,
  who issued it, when it expires, and whether it is outstanding, accepted, expired, or revoked.
  Exists because the chosen role must survive the gap between "an Admin invited them" and "they
  signed in" in a form the invitee cannot alter, and because "invited but not yet joined" is a state
  the Admin needs to see.
- **Usage Record**: One successfully generated proposal, attributed to a member, with the time it was
  generated. Holds nothing about the proposal's contents. Exists because a count must be queryable
  per member and organisation-wide; a log line is not.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of generated proposals are attributable to a named, active member. Zero proposals
  can be produced anonymously by any route.
- **SC-002**: An Admin can bring a new colleague from "not invited" to "generated their first
  proposal" in under 10 minutes, without engineering assistance.
- **SC-003**: A Sales member reaches zero organisation-wide figures and zero other-member information
  when attempting direct navigation to every administrative view and direct submission of every
  administrative action.
- **SC-004**: The organisation is never left without an active Admin — demonstrated by two Admins
  attempting to remove each other simultaneously, where exactly one attempt succeeds.
- **SC-005**: A member whose access is removed is refused on their very next action, with no waiting
  period.
- **SC-006**: Every count displayed matches an independent count of the underlying records exactly,
  with no rounding, caching, or approximation.
- **SC-007**: For identical inputs, a proposal generated after this feature is byte-identical to one
  generated before it.
- **SC-008**: The proposal generator's appearance is unchanged — a before-and-after visual comparison
  of the form shows no difference.
- **SC-009**: 20 consecutive proposal generations by signed-in members all succeed against a single
  running instance.
- **SC-010**: 100% of dashboard views present meaningful content, a purposeful empty state, or a
  retry-able error. No view can render blank or fail unhandled.
- **SC-011**: A member can go from opening the application to a usable signed-in session in under 2
  minutes, limited only by email delivery.
- **SC-012**: A member who signs in once is not asked to sign in again for **30 days** of continued
  use, the window refreshing on each use. Sign-in is a rare cost, never a per-proposal one.
- **SC-013**: The time to produce one proposal, measured from opening the form to holding the PDF,
  stays under the existing 2-minute target for an already-signed-in member.
- **SC-014**: Every task in the new views — signing in, inviting a member, changing a role, removing
  and restoring access, reading both dashboards — can be completed **using only a keyboard**, with
  focus visible at every step, and reports zero WCAG 2.2 AA violations from an automated
  accessibility check.

## Scope

### In scope

Sign-in and sign-out; invitation-only access with role assignment; two roles; active/inactive status
with reversible removal; the at-least-one-Admin guarantee; per-member and organisation-wide
generation counts; the members and invitations administration views; a first-Admin bootstrap that is
not reachable from the deployed application; loading, empty, and error states for every dashboard
view.

### Out of scope

- Storing proposal contents, or any proposal history beyond a count
- A full audit log of every administrative action *(the invitation and usage records give partial
  coverage; a complete log is a follow-on)*
- Permanent deletion of a member and their history
- Self-service sign-up, passwords, or third-party single sign-on
- A third role, custom permissions, or per-permission assignment
- Per-member **proposal-generation** quotas or rate limits *(note: sign-in link requests **are**
  throttled — FR-042. The two are different surfaces; only generation is out of scope here)*
- Client/IP-based rate limiting, bot detection, or CAPTCHA on the sign-in form
- Time-windowed or per-period figures (totals are all-time)
- Migrating the service/tool catalog out of code *(explicitly a separate decision — see
  Constitution Technology Constraints)*
- Any change to how proposals are laid out, rendered, or branded
- Accessibility remediation of the **existing** proposal generator. FR-044's WCAG 2.2 AA bar covers
  the views this feature introduces; auditing and changing the existing form would contradict FR-040
  and is exactly the unrelated refactor Constitution Principle IV forbids. Worth doing — separately.
- Accessibility of the **generated PDF** (tagging, reading order). The document is unchanged by this
  feature (FR-013) and is a separate concern from the application's interface.

## Dependencies

- **Constitution v4.0.0** (`.specify/memory/constitution.md`, amended 2026-08-01). This feature was
  forbidden under v3.0.0, which required the pipeline to remain stateless with no required database
  or authentication. Principle III was redefined to *Additive Extension* and Principle VI
  (*Authorization Is Server-Enforced, on Every Request, from Live State*) was added specifically to
  govern this work. FR-008, FR-010, FR-011, FR-033, and FR-036 restate Principle VI obligations at
  feature level, and are therefore non-negotiable rather than preferences.
- **Feature 001 (proposal PDF generator)** is the surface this wraps. FR-013 and SC-007 exist to make
  the wrapping provably non-invasive.
- **Sustained-generation defect.** The generator currently accumulates temporary files and fails after
  roughly seven generations on a single running instance. SC-009 gates this feature on that being
  fixed first: gating the tool behind sign-in makes the defect worse, not better, because the same
  members keep the same instance warm — and the Admin's headline figure would visibly stall while
  reps report failures. Per Constitution Workflow Rules, a known defect in a depended-on surface is
  fixed before a feature is layered over it.
- **Outbound email delivery** is on the critical path — an invitation that is never delivered is a
  member who cannot be added, and with passwordless sign-in it is the *primary auth path*, not just
  the invite path. A sender suitable for production use is required before the invitation capability
  is considered complete.
- **A Google account with 2-Step Verification enabled.** Whaz owns no domain, so email is sent
  through Gmail SMTP as `whazpk@gmail.com` using an App Password (Clarifications, 2026-08-02).
  Without 2SV on that account, no App Password can be generated and the feature cannot send at all.
  This makes a single Google account a dependency of sign-in; if it is lost or its password is
  rotated without updating Supabase, nobody can sign in.
- **The member store becomes a hard dependency of proposal generation.** Before this feature the
  generator had no runtime dependencies; after FR-001 and FR-006 it has one, and FR-045 makes an
  outage a total outage by design. **No availability target is set in this spec** — that was a
  deliberate decision (Clarifications, 2026-08-01), on the grounds that an unmeasurable percentage
  with no monitoring behind it commits to nothing. One known hazard is recorded here without a
  requirement attached: free-tier managed databases commonly suspend after a period of inactivity,
  and a small team's quiet week is enough to trigger it — so the first request after a slow period
  can fail. Whether to prevent that (e.g. a scheduled keep-alive) is an operational choice for
  `/sp.plan`, not a requirement of this spec.

## Assumptions

Recorded rather than invented; each is cheap to reverse if wrong.

1. **Single organisation.** One Whaz team; no concept of separate organisations or workspaces.
   `dashboard.txt` says "members," not "organizations."
2. **"Delete" means remove access, not erase the person.** `dashboard.txt` says "Can delete any admin
   or sales"; this is implemented as reversible removal so that historical totals stay correct and a
   departure is not an irreversible data loss event. The word "delete" may still appear in the
   interface, with the confirmation explaining what actually happens.
3. **"Number of members active" means members whose access is currently enabled**, not members who
   have signed in recently. No session or activity tracking is implied.
4. **"Number of successful PDF generated" is an all-time total**, unfiltered by date.
5. **Removed members' past generations still count** toward the organisation-wide total. The figure
   measures output produced, not current headcount.
6. **Admins can also generate proposals.** `dashboard.txt` does not forbid it, and forbidding it
   would be a surprising restriction on a small team where an Admin is also a seller.
7. **Invitations expire after 7 days.** Not specified; a common default, and trivially adjustable.
8. **Email address is the identity.** No usernames, no display names, no profile.
9. **`dashboard.txt` line 14 is truncated** mid-sentence ("Can invite as admin or sales via ___").
   Resolved as an emailed sign-in link, per the direction agreed during planning.
10. **No historical usage is backfilled.** Nothing was recorded before this feature, so counts start
    at zero for everyone on the day it ships. Admins should expect the organisation-wide total to
    begin at zero rather than reflect past activity.
11. **Members' data is retained indefinitely** after their access is removed. No retention or erasure
    requirement has been stated; if one arrives it becomes a separate feature.
12. **English only.** Consistent with the rest of the application.
13. **The team is small — single-digit to low-double-digit members.** No source document states a
    headcount; only the volume is known (~10–50 proposals/day). Two design consequences
    ride on this and would need revisiting at a much larger size: the members list is presented
    unpaginated and unsearchable, and administrative changes are assumed rare enough that briefly
    serialising them costs nothing noticeable.
14. **Members work on their own trusted devices in normal browsers.** This is what makes a 30-day
    sliding session (FR-041) appropriate. No kiosk or shared-device scenario is in scope; if one
    arrives, the session window is the setting to revisit, not the revocation mechanism.
