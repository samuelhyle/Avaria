# Researcher task review protocol — 2026-10-15

**Status: prepared, not conducted.** This is the remaining human acceptance protocol for the site experience implementation. None of the participant outcomes or approval targets below has been achieved or measured by preparing this document. Automated checks and screenshots do not substitute for these sessions.

Use the [master plan](SITE_EXPERIENCE_MASTER_PLAN_2026-10-15.md), [implementation record](SITE_EXPERIENCE_IMPLEMENTATION_2026-10-15.md) and [content inventory](CONTENT_INVENTORY_2026-10-15.md) alongside this protocol. Record the exact tested deployment and source commit in each session; never combine results from different builds without identifying them.

## Preparation and boundaries

- Recruit researchers or people who procure or document laboratory research materials. Cover Finnish and English separately, including people unfamiliar with this site. Use anonymous codes such as `FI-01` and `EN-01`; do not collect names, employer, research subjects, health information or payment details in the worksheet.
- Proposed initial benchmark: **at least 10 participants per primary language**, with both desktop and physical mobile coverage. Smaller formative rounds can find problems sooner, but must not be reported as completion of this benchmark. Report the observed counts as well as percentages; this is a practical acceptance target, not a statistical population claim.
- Start in the participant's assigned language, with a clean browser state. Record device, browser, viewport, input method, language and consent state. Offer the same task wording without explaining navigation or the expected answer.
- Select a real catalogue product with at least two quantities before the session. Record its current SKU, availability/purchase state and genuinely applicable public document records in the moderator's answer sheet. If no public original exists, that is a valid state to assess. Do not create a report, make a restricted record public or invent product evidence to complete the exercise.
- Use an explicitly labelled, isolated QA environment for any task that needs a private draft, saved calculation or account. **Owner-approved QA-only accounts and fixtures are future preparation; this protocol does not create accounts or authorise contacting anyone.** Until those are prepared, assess publication understanding from the visible public interface and mark persistence exercises untested.
- No real orders, payment attempts, support submissions, emails, document uploads, community publication or account creation. Never use another customer's account or data. Stop before a submit/publish/send action. AI source inspection uses a prepared, labelled QA conversation or an owner-approved existing evaluation result; do not trigger a new provider request merely to run this session.
- Ask permission separately before any recording. Prefer anonymous written observations. Do not capture personal tabs, account identifiers or free-form personal information. Agree access and deletion timing before collecting notes.

## Participant introduction

**EN:** “We are testing the website, not you. Please try the tasks as you normally would and tell us what you expect and what you find unclear. You may stop at any time. Do not enter personal information, order anything, send messages or publish a post.”

**FI:** “Testaamme verkkosivustoa, emme sinua. Tee tehtävät tavalliseen tapaasi ja kerro, mitä odotat tapahtuvan ja mikä jää epäselväksi. Voit lopettaa milloin tahansa. Älä syötä henkilötietoja, tee tilausta, lähetä viestejä tai julkaise kirjoitusta.”

If someone asks for help, first say “What would you try next?” / “Mitä kokeilisit seuraavaksi?” Record any later moderator guidance; a guided completion is not an unassisted success. Do not teach the answer during a scored task.

## Tasks and moderator answer sheet

Replace bracketed product names with the selected real product. Keep the expected answers below away from participants.

| Task | English prompt | Finnish prompt | Successful understanding / observations |
| --- | --- | --- | --- |
| 1. Find and compare | “Find [product]. Compare the available quantities. Choose the quantity you would investigate further, then tell me its product code, quantity and current availability. What can you do next?” | “Etsi [tuote]. Vertaa saatavilla olevia määriä. Valitse määrä, johon haluaisit tutustua tarkemmin, ja kerro sen tuotekoodi, määrä ja tämänhetkinen saatavuus. Mitä voit tehdä seuraavaksi?” | Identifies the currently selected SKU and its nominal quantity, rather than a different variant. Reads the actual stock/purchase/enquiry state without assuming the product can be ordered. Changes selection and checks that the identifier, illustration and document context agree. Do not score an enquiry-only product as an unsuccessful find. |
| 2. Evaluate available records | “What information and original documents, if any, can you find for your selected quantity? Explain which records apply to it and what you still cannot establish.” | “Mitä tietoja ja alkuperäisiä asiakirjoja löydät valitsemallesi määrälle, jos niitä on saatavilla? Kerro, mitkä asiakirjat koskevat valintaasi ja mitä et vielä pysty selvittämään.” | Finds the library or product records without a hinted route. Distinguishes product-wide records from exact batch/SKU records and recognises when no public original is available. Does not infer purity, release, experimental suitability or an undisclosed report from publication/absence alone. |
| 3. Recover from a search | “Use the document search to look for `TASK-NO-MATCH-20261015`. Describe what the result means. Then return to the available documents.” | “Etsi asiakirjahaulla `TASK-NO-MATCH-20261015`. Kerro, mitä hakutulos tarkoittaa. Palaa sitten saatavilla oleviin asiakirjoihin.” | Recognises a search with no matches; does not conclude that the whole collection is empty or the service is broken. Clears the filters and sees restored context. If the service actually fails, record recovery behaviour separately; do not silently classify that as no-match. |
| 4. Calculate and interpret | “For a calculation exercise, use a nominal mass of 10 mg and a final solution volume of 2 mL. Find the mass concentration. Explain what the result tells you and what it does not tell you about the material.” | “Käytä laskuharjoituksessa nimellismäärää 10 mg ja liuoksen lopullista tilavuutta 2 mL. Selvitä massapitoisuus. Kerro, mitä tulos kertoo ja mitä se ei kerro materiaalista.” | Enters 10 mg and **final solution volume** 2 mL in the appropriate mode, obtains **5 mg/mL**, and interprets the chosen inputs and units. Does not describe this as measured purity, measured peptide content or proof of batch quality. Adding 2 mL of solvent is not automatically the same factual input as a 2 mL final solution volume. Do not ask for administration or dose advice. |
| 5. Inspect Averia's source | “Look at this prepared Averia answer. Find the source it uses. Explain what the source supports and what you would still verify before relying on the answer.” | “Tutustu tähän valmiiseen Averian vastaukseen. Etsi sen käyttämä lähde. Kerro, mitä lähde tukee ja mitä vielä tarkistaisit ennen vastaukseen luottamista.” | Opens/identifies the displayed source or guidance version and connects it to the stated claim. Distinguishes guidance, a deterministic calculation and an original product/batch report. Does not treat fluent wording, a citation or a community reaction as independent scientific approval. If the prepared answer has no source, recognising that limitation is success; do not imply a source exists. |
| 6. Understand privacy and publication | “You want to prepare a discussion for colleagues and decide later whether to share it. Show how you would begin, stopping before any submission. Who could see it now, and what would have to happen for other people to see it?” | “Haluat valmistella keskustelun kollegoille ja päättää myöhemmin sen jakamisesta. Näytä, miten aloittaisit, mutta älä lähetä mitään. Kuka voisi nähdä sen nyt, ja mitä pitäisi tapahtua, jotta muut näkisivät sen?” | Distinguishes unsaved text, a private saved draft, submission for review and publication using the actual visible state. Does not assume that typing, saving, submitting or a positive reaction makes a post public or scientifically validated. Exercise saving only with future approved QA fixtures; otherwise score understanding and mark persistence untested. |
| 7. Language, units and mobile | “Switch to [Finnish/English]. Continue with the same selected product and quantity. Find the calculator again and explain the units you see. On this phone, show how you would read the document filters and enter or correct a number.” | “Vaihda kieleksi [suomi/englanti]. Jatka samalla tuotteella ja määrällä. Etsi laskuri uudelleen ja kerro, mitä sen yksiköt tarkoittavat. Näytä tällä puhelimella, miten lukisit asiakirjasuodattimet ja syöttäisit tai korjaisit luvun.” | Finds the language control, retains the valid selected SKU/context and recognises unit case and spacing. Reads Finnish labels without guessing from English and understands the supported decimal input. On a physical device, fields, errors, focused controls and recovery remain usable with the on-screen keyboard. Observe both portrait and landscape where practical. Do not count desktop device emulation as physical mobile coverage. |

For task 5, the moderator must record the prepared answer's exact text/source and how it was obtained. A mocked display fixture tests presentation and comprehension only; an actual provider result tests that recorded response, not all future AI answers. For task 7, participants need not be bilingual: use bilingual participants for language handoff and separate native participants for each language's comprehension.

## Scoring and proposed acceptance

Score each applicable task as **U** (unassisted success), **G** (completed with guidance), **F** (failure or unresolved misunderstanding), **B** (blocked by a site/service fault) or **N/T** (not tested, with reason). Record the participant's explanation as well as clicks. A completion with the wrong scientific or privacy interpretation is not a success. Include site-blocked tasks in the attempted-task denominator and report them separately; omit only explicitly untested tasks.

Proposed release target, **not yet measured**:

- At least **90% unassisted success for each critical task in each primary language**, with counts and denominators shown. Do not hide a weak task or language inside an overall average. With 10 completed observations per language/task, this means at least 9 unassisted successes.
- **No unresolved critical misunderstanding:** wrong SKU/document scope; nominal calculation taken as an assay or dosing instruction; missing evidence taken as verification; private draft taken as public or vice versa; submitted content taken as already published; an unavailable service taken as a valid empty result. A single such observation requires investigation and a targeted retest, even if the percentage target is met.
- No necessary action blocked by clipping, unreadable labels, lost selection, inaccessible focus or the physical mobile keyboard. Record time and perceived difficulty to find friction; do not invent time limits after observing results.
- Log concrete wording and navigation problems, assign an owner, and repeat the affected task on the corrected build with fresh participants where possible. State any remaining limitation rather than reporting a blanket pass.

## Moderator worksheet

Copy one worksheet per participant. Use short observations and participant quotes without identifying details.

| Session field | Value |
| --- | --- |
| Anonymous participant code / primary language | |
| Date / moderator code | |
| Deployment URL / complete source commit | |
| Device / browser / viewport / physical or emulated | |
| Input method / assistive technology / consent state | |
| Research/procurement familiarity (optional broad category only) | |
| Selected product / SKU / quantity / actual availability | |
| Applicable public document IDs / scope / current file state | |
| Prepared Averia answer provenance / source / actual or display fixture | |
| QA environment and approved fixture reference, if needed | |

| Task | Start–end / duration | U / G / F / B / N/T | Participant interpretation | Guidance, friction or critical misunderstanding | Issue / owner / retest |
| --- | --- | --- | --- | --- | --- |
| 1. Product/quantity/status | | | | | |
| 2. Applicable documents | | | | | |
| 3. Search recovery | | | | | |
| 4. 10 mg / 2 mL | | | | | |
| 5. Averia source | | | | | |
| 6. Private/public states | | | | | |
| 7. Language/units/mobile | | | | | |

After the tasks, ask “What would you still need before trusting or using this site for your work?” / “Mitä vielä tarvitsisit, ennen kuin luottaisit sivustoon tai käyttäisit sitä työssäsi?” Record the answer without promising unsupported changes. Summarise results by task, language and device, including incomplete sessions and all critical misunderstandings.

## Separate approval and accessibility work

These are independent workstreams; a successful usability session does not complete them:

| Remaining review | Required evidence / reviewer |
| --- | --- |
| Native language signoff | Independent native Finnish and English reviewers check the complete inventory, including metadata, email, error, pending and recovery text. Native DE/SV/NL review covers the documented English fallback and translated surfaces before claiming full localisation. |
| Scientific content signoff | A suitably qualified independent reviewer checks formulas, input assumptions, nominal-versus-measured distinctions, units, molar prerequisites, guidance and cited source/version boundaries. No scientific approval is inferred from this protocol or automated tests. |
| Seller/specification/original-report approval | Owner supplies and approves the deferred seller details, exact specifications, policies and original reports; reviewers check association, version and actual applicability. They are not fabricated for usability testing. |
| Physical mobile and keyboard | Real iOS/Android devices: keyboard opening/closing, decimal input, focus visibility, orientation, scroll and fixed-control overlap. Desktop keyboard-only traversal, recovery and long table/code-region scrolling. Record device/browser and observed outcome. |
| Screen reader and native zoom | Human checks with named screen-reader/browser combinations, meaningful labels/announcements, reading order, dialogs, result changes and errors; actual browser zoom and operating-system text settings. CSS reflow and automated accessibility scans remain separate evidence. |
| Private persistence and provider operations | Future owner-approved QA-only fixtures for saving/restoring/replacing/deleting private drafts and plans. Separately authorised provider/mail/payment rehearsals must use appropriate test environments; no real transaction or message is required by this protocol. |

Final reporting must name what was observed, on which build, and what remains pending. Preparing this worksheet establishes a reviewable next step; it supplies no participant results, native approval, scientific approval or physical-device acceptance.
