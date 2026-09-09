# Argus

*A personal career toolkit, built for one. First module: **Assay**.*

## Assay — paste any job, get a tailored, graded application

Assay takes any job description and your one master resume, and produces a complete application package: a tailored CV, a cover letter, and answers to the screening questions you're most likely to face. Before you send anything, a simulated three-person panel — a recruiter, a hiring manager, and a fact-checker — grades the package honestly.

![The graded scorecard with match score, dimension assay, and reviewer panel](docs/screenshots/assay-scorecard.png)

![The tailored package tabs: CV, cover letter, and form answers](docs/screenshots/assay-tabs.png)

![Assay on a mobile screen](docs/screenshots/assay-final-mobile.png)

## How it works

- Save your master resume once — paste it or upload a PDF/DOCX, with text extracted entirely in your browser.
- Paste any job description.
- One structured call to Gemini builds the full package — CV, cover letter, and form answers.
- The package is scored 0–100 across five dimensions and reviewed by the three-person panel, then auto-saved to your local history — where each saved assay becomes a tracked application: set its status (Saved → Applied → Interview → Offer / Rejected), keep private notes on it, and watch your pipeline stats at a glance.
- Across all saved assays, an Insights panel shows what the market keeps demanding and where your evidence is repeatedly weak — and after you improve your resume, one click re-runs any old JD to prove the score moved.

## Privacy

There is no backend. Your resume, API keys, and assay history live only in your browser's localStorage. Nothing is uploaded anywhere except the single prompt sent directly to the provider's API with your own key.

## Anti-fabrication

The system prompt forbids inventing experience, metrics, employers, or skills — content may only be reframed, reordered, and emphasized from what actually exists in your real resume. A dedicated fact-check reviewer names anything that was softened, stretched, or is unsupported, and confirms what traces to real evidence.

## Run locally

```sh
cd assay
npm install
npm run dev
```

Then get a free API key from any of Google AI Studio (Gemini), Groq Console, or Cerebras Cloud and add it via the key button in the app header. Add one or more keys — with multiple keys saved, Assay fails over automatically when one provider is rate-limited.

## Roadmap

- [x] Application tracker (statuses, notes, stats)
- [x] Gap intelligence across saved assays
- [x] Resume version diffing
- [ ] Interview prep from any saved assay
- [ ] Test suite + CI
