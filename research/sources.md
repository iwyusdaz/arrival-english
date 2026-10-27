# Sources

Every factual claim used in the game or its docs, with the source that was opened and checked.
Access date for all entries: **2026-10-27**. Status: **verified** = opened and the quoted text checked;
**partly verified** = bibliographic details checked, full text not read; **UNVERIFIED** = not checked.

| # | Claim (as used) | Source | Status |
|---|---|---|---|
| S1 | CEFR global scale wording for A2 and B1 (used in design/cefr-alignment.md) | Council of Europe, "Global scale - Table 1 (CEFR 3.3): Common Reference levels", https://www.coe.int/en/web/common-european-framework-reference-languages/table-1-cefr-3.3-common-reference-levels-global-scale | verified (text copied from the page) |
| S2 | Illustrative descriptors quoted in design/cefr-alignment.md (Obtaining goods and services p. 78; Information exchange p. 79; Asking for clarification p. 89; Monitoring and repair p. 70; Overall oral interaction p. 72; Understanding announcements and instructions p. 51) | Council of Europe (2020), *Common European Framework of Reference for Languages: Learning, teaching, assessment – Companion volume*, Council of Europe Publishing, Strasbourg, ISBN 978-92-871-8621-8. PDF: https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4 | verified (PDF downloaded; descriptor text extracted with pdftotext and checked against the rendered page; printed page numbers match PDF page numbers) |
| S3 | "Monitoring and repair" has no A2 descriptors ("No descriptors available") | S2, p. 70 | verified |
| S4 | A 2025 systematic review of 6 recent RCTs found VR generally positive vs non-VR for K-12 foreign-language vocabulary and listening, with a consistent positive effect on long-term retention; immediate gains inconclusive; heterogeneity and "some concerns" risk of bias | Sun, L. & Song, X. (2025). The effectiveness of virtual reality for K-12 foreign language learning: a systematic review of recent randomized controlled trials. *Frontiers in Psychology*, 16. https://doi.org/10.3389/fpsyg.2025.1714481 | verified (abstract read) |
| S5 | A 2026 meta-analysis (21 studies, 2,503 participants) found a moderate positive effect of VR on productive language skills (g = 0.538) | Şimşek, B., Direkci, B., Koparan, B. & Gülmez, M. (2026). The effect of virtual reality applications on the development of productive language skills: a meta-analysis. *Frontiers in Education*, 11. https://doi.org/10.3389/feduc.2026.1782286 | verified (abstract read) |
| S6 | Technology lowers foreign-language anxiety through psychological safety and personalised feedback, and raises it through cognitive overload and reduced human interaction (99 empirical studies, 2004-2024) | Huang, L. & Liu, M. (2025). The impact of technology on foreign language anxiety: A systematic review of empirical studies from 2004 to 2024. *Humanities and Social Sciences Communications*, 12, 1665. https://www.nature.com/articles/s41599-025-05921-6 | verified (abstract read) |
| S7 | Ellis, R. (2003). *Task-based Language Learning and Teaching*. Oxford University Press | Open Library record https://openlibrary.org/works/OL15204241W (first published 2003; edition OL22525075M, ISBN 9780194421591) | partly verified (title, author, publisher, first-publication year). The book itself was not opened; the pre-task / task / post-task framing is used as the plan's design framework, not as a quotation |
| S8 | In some browsers (e.g. Chrome) speech recognition uses a server-based engine, so audio is sent to a web service; on-device recognition is possible where supported | MDN, "Using the Web Speech API", https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API ; MDN, "SpeechRecognition", https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition | verified |
| S9 | Poly Haven assets are CC0 | https://polyhaven.com/license ("Our assets are all licensed as CC0") | verified |
| S10 | ambientCG assets are CC0 1.0 | https://docs.ambientcg.com/license/ | verified |
| S11 | HDRI names, authors, publication dates, categories | Poly Haven API, https://api.polyhaven.com/info/{id} (hamburg_hbf, comfy_cafe, phone_shop, st_fagans_interior) | verified |
| S12 | A2 Key vocabulary list (UCLES, August 2025) and B1 Preliminary vocabulary list (August 2025); A2 Appendix 1 says candidates also know cardinal numbers to one thousand and ordinal numbers to thirty-first | https://www.cambridgeenglish.org/images/506886-a2-key-2020-vocabulary-list.pdf ; https://www.cambridgeenglish.org/images/506887-b1-preliminary-vocabulary-list.pdf | verified (PDFs downloaded and parsed; not committed, copyright UCLES / CUPA) |
| S13 | Vercel limits: static file uploads 100 MB (Hobby) / 1 GB (Pro) via CLI; no upper limit for build output files | https://vercel.com/docs/limits | verified |
| S14 | Flesch Reading Ease and Flesch-Kincaid grade formulas | Standard published formulas (Flesch 1948; Kincaid et al. 1975) | formulas used as commonly published; original papers not opened (UNVERIFIED as citations) |

## Cited by the shared standards but not re-verified in this repo

The set-wide evidence table in `00-immersive-standards.md` (serious-games meta-analysis, Zhao et al. 2022,
Makransky et al., seductive details, decorative animation) informs the restrained cinematic policy here.
Those sources were not re-opened for this repo and are not quoted in its docs.

## Not used

- MakeHuman (https://static.makehumancommunity.org/about/license.html): the licence page was not needed
  because MakeHuman exports could not be produced in this build environment (see DECISIONS.md D-07).
