# Historical code audit

This is a historical record of fixes at the baseline below, not a current architecture certification or current test count. For the 2026-10-27 documentation audit, unresolved implementation findings and executed validation, see [the current audit](documentation-architecture-audit.md).

This audit covers the shared frontend, gathering-specific RSVP behavior, editing,
state persistence, deployment bundle, and worker code. The audited starting point
was `ab2a366` on `main`.

## Fixes

- Release removed headings from the text-fitting resize observer. RSVP reviews
  and custom pages rebuild their headings; retaining disconnected elements could
  accumulate observers during a long session.
- Remove `href` and keyboard tab stops from unavailable Registry actions. The
  previous `#` placeholder could still activate from a keyboard despite the
  disabled appearance. Adding a URL restores normal link behavior.
- Update nine obsolete DOM test cases to the approved flat Wedding navigation,
  separate host navigation, shared formatter, and current audience rules. These
  asserted earlier layouts rather than the current requirements. Keep the
  existing privacy, editing, content, and shared-renderer checks.

## Verification

- Full `npm test`: 34 test files passed, none failed.
- JavaScript syntax checks passed for tracked application, script, and worker
  files.
- An additional ESLint correctness scan passed for 61 application, worker, and
  test files. Browser-driven verification scripts run code in another page's
  context, so they were excluded from undefined-global analysis; their syntax
  was still checked.
- A DOM integration run loaded the real HTML and frontend scripts with synthetic
  accounts and network calls stubbed. Thanksgiving, Christmas, and Wedding
  passed sign-in, direct RSVP entry, completion, return home, and response-badge
  checks. Wedding's attire heading survived responsive redraws.
- The host editing integration passed text editing, saving during responsive
  redraw, Done Editing, and reopening with formatting and blank lines retained.
- Regression tests cover observer cleanup and unavailable/re-enabled Registry
  links. Existing suites cover invitation membership, children and guests,
  meals, saved copy, tab order, page privacy, shared state, media helpers, and
  domain deployment/routing.

## Limits

The interaction checks use a DOM simulator, not a visual browser walkthrough.
They do not submit live RSVPs, upload real files, or exercise external services
with real credentials. Passing checks reduce regression risk but cannot prove
that every browser, network condition, or external service will be glitch-free.
