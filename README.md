# PGOS — Product Growth Operating System

Enterprise product lifecycle management. From strategy through engineering handoff, in one platform.

**Stack:** React · Vite · Vercel Serverless · Neon PostgreSQL · Anthropic Claude

---

## Deployment — 7 Steps

### 1. Create a GitHub Repository

```bash
git init
git add .
git commit -m "Initial PGOS production build"
gh repo create pgos --private --push --source .
```

Or create the repo on github.com, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/pgos.git
git push -u origin main
```

---

### 2. Create a Neon Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project (any name, e.g. `pgos`)
3. In your project, click **SQL Editor**
4. Open `pgos_schema.sql` and paste the **entire file** into the editor
5. Click **Run** — this creates all tables and inserts seed data
6. Go to **Connection Details** and copy the **Connection String**
   - It looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

---

### 3. Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key
3. Copy the key (starts with `sk-ant-`)

---

### 4. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **New Project** → import your `pgos` repository
3. Vercel auto-detects Vite — no framework changes needed
4. Before clicking Deploy, go to **Environment Variables** and add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `VITE_APP_NAME` | `PGOS` |

5. Click **Deploy**
6. Wait ~60 seconds for the build to complete

Your app is live at `your-project.vercel.app`.

---

### 5. Verify Deployment

After deploy, visit your URL and check:

- [ ] Dashboard loads with 3 seed initiatives
- [ ] Foundation shows mission, OKRs, themes, capabilities, products
- [ ] Chatty opens (gold ◆ button, bottom right)
- [ ] Navigate to an initiative and generate an Exec Brief (tests AI)
- [ ] Reference → Framework Deck (10-slide interactive deck)
- [ ] Reference → How To Use PGOS (9-section guide)

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env — add DATABASE_URL and ANTHROPIC_API_KEY

# Start Vite dev server
npm run dev

# Open http://localhost:3000
```

> Note: Vercel functions run in the cloud during local dev via the Vite proxy in `vite.config.js`. For local serverless function testing, use `vercel dev` (requires Vercel CLI).

---

## Project Structure

```
pgos/
├── api/
│   ├── ai.js          ← All AI calls (16 actions, 1 function)
│   ├── data.js        ← All CRUD (9 resources, 1 function)
│   └── upload.js      ← File uploads + AI analysis (1 function)
│
├── src/
│   ├── App.jsx        ← Root router + layout
│   ├── main.jsx       ← React entry
│   ├── contexts/
│   │   └── AppContext.jsx   ← Global state + DB persistence
│   ├── components/
│   │   ├── ui/index.jsx     ← Tag, AIBox, ScoreRing, PivotSlider, etc.
│   │   └── layout/Sidebar.jsx
│   ├── lib/
│   │   ├── tokens.js   ← Design tokens + PIVOT/WSJF helpers
│   │   └── api.js      ← All API calls (no keys in browser)
│   └── pages/
│       ├── Dashboard.jsx
│       ├── Foundation.jsx
│       ├── InitiativeDetail.jsx  ← Ideas + 8-tab detail
│       ├── Portfolio.jsx         ← Portfolio, PIPlanning, Handoff, StageList, Chatty
│       └── References.jsx        ← Framework Deck + How To Use PGOS
│
├── public/
│   └── index.html
│
├── pgos_schema.sql    ← Run this in Neon to initialize the DB
├── vercel.json        ← 3 serverless functions, SPA rewrite
├── vite.config.js
├── package.json
└── .env.example
```

---

## Architecture Notes

**3 Vercel functions (well under the 10–12 free limit):**

| Function | Purpose | Actions |
|----------|---------|---------|
| `/api/ai` | All AI calls | 16 actions dispatched by `action` param |
| `/api/data` | All CRUD | 9 resources × CRUD via `resource` + `action` params |
| `/api/upload` | File uploads | PNG/JPG/PDF/PPTX with AI vision analysis |

**Security:** API keys never leave the server. All AI calls are server-side. The browser only sends prompts and receives generated text.

**Persistence:** React Context with debounced DB writes (800ms–1500ms). Foundation changes auto-save. Initiative changes auto-save on every field edit. No manual save buttons needed.

**PIVOT Score™:** Never renamed. Stored as five separate `pivot_p/i/v/o/t` columns in Neon. Normalized/denormalized in `src/lib/tokens.js`.

---

## Updating the App

**Add a new AI action:**
1. Add the action to `/api/ai.js` in `systemMap` and the `switch` statement
2. Add the token budget to `TOKEN_MAP`
3. Call it from the frontend with `callAI("your_action", payload)`

**Add a new database resource:**
1. Add the table to `pgos_schema.sql` and run the migration in Neon
2. Add a handler function in `/api/data.js`
3. Register it in `resourceMap`
4. Add convenience wrappers to `src/lib/api.js`

**Schema migrations:**
Run your `ALTER TABLE` statements directly in the Neon SQL Editor.

---

## Framework Reference

**PIVOT Score™** = P(25%) · I(20%) · V(15%) · O(20%) · T(20%) × 10
- 70–100: COMMIT | 55–69: CONSIDER | 40–54: DEFER | 0–39: KILL

**WSJF** = (Business Value + Time Criticality + Risk Reduction) ÷ Job Size

**7-Stage Pipeline:** Idea → Discovery → Exec Review → Portfolio → Definition → Delivery → Handoff

---

*Built for product leaders who need to defend every dollar of investment.*
