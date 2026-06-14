# PT — personlig trener

En mobil-web-app (PWA) for personlig trening: AI-genererte program, øktlogging med
hvile-timer og motivasjon, progresjon med graf og PR-er, og en AI-trener du kan spørre.

Bygget med Vite + React. AI-en kjøres via en liten serverfunksjon på Vercel slik at
API-nøkkelen aldri havner i nettleseren. Data lagres lokalt på brukerens enhet
(localStorage) — ingen database, ingen innlogging. Perfekt for en venn-test.

---

## Hva du trenger
- Node 18+ installert lokalt (kun for å teste på din egen maskin — valgfritt)
- En gratis Vercel-konto: https://vercel.com
- En Anthropic API-nøkkel: https://console.anthropic.com  → Settings → API Keys

> Appen fungerer UTEN nøkkel også — da bruker den et innebygd standardprogram og en
> enkel offline-trener. AI-funksjonene (personlig program + chat) skrur seg på i det
> øyeblikket nøkkelen er satt.

---

## Raskeste vei: deploy til Vercel via GitHub

1. **Last opp koden til GitHub.** Lag et nytt, tomt repo og push denne mappa
   (eller dra-og-slipp filene i GitHubs nettleser). `node_modules` skal IKKE være med
   (den ligger allerede i `.gitignore`).

2. **Importer i Vercel.** På vercel.com → *Add New → Project* → velg repoet.
   Vercel kjenner igjen Vite automatisk. Trykk ikke deploy helt ennå — sett nøkkelen først (steg 3).

3. **Sett API-nøkkelen.** Under *Environment Variables*:
   - Name: `ANTHROPIC_API_KEY`
   - Value: nøkkelen din fra Anthropic-konsollet
   Legg den til, så **Deploy**.

4. **Ferdig.** Du får en URL som `pt-app-xyz.vercel.app`. Send den til vennen din.

> Endrer du nøkkelen senere: Vercel → Project → Settings → Environment Variables,
> og **Redeploy** for at endringen skal slå inn.

### Alternativ: Vercel CLI
```bash
npm i -g vercel
vercel            # følg veiviseren
vercel env add ANTHROPIC_API_KEY    # lim inn nøkkelen
vercel --prod
```

---

## Kjøre lokalt (valgfritt)
```bash
npm install
npm run dev       # åpner på http://localhost:5173
```
NB: serverfunksjonen `/api/claude` kjører ikke under `vite dev`. For å teste AI lokalt:
```bash
npm i -g vercel
vercel dev        # kjører både frontend og /api sammen
```
Sett da nøkkelen i en `.env`-fil i rotmappa:
```
ANTHROPIC_API_KEY=din-nøkkel-her
```

---

## Slik tester vennen din
1. Åpne URL-en på mobilen.
2. **Legg til på Hjem-skjerm** for app-følelse:
   - iPhone (Safari): Del-knappen → «Legg til på Hjem-skjerm»
   - Android (Chrome): meny → «Installer app» / «Legg til på startskjerm»
3. Gå gjennom oppsett → få program → start en økt → logg **reps og kg** per sett.
4. Fullfør, og gjenta gjerne samme økt med litt tyngre vekt for å se PR + grafer
   under **Fremgang**-fanen.

All data ligger på hennes/hans egen enhet og forsvinner kun hvis nettleserdata tømmes.
«Nullstill»-knappen (øverst på Trening-fanen) starter på nytt med blanke ark.

---

## Justeringer
- **Modell / kostnad:** `api/claude.js` bruker `claude-sonnet-4-6`. Får du
  «model not found», sjekk gjeldende modellnavn på console.anthropic.com og bytt
  konstanten `MODEL` øverst i fila. Vil du kutte kostnad, bytt til en Haiku-modell.
- **Pris:** Hver programgenerering og hver trener-melding bruker litt API-kreditt
  (typisk brøkdeler av en krone per kall). Greit for en test; sett gjerne et
  forbrukstak i Anthropic-konsollet.

---

## Filstruktur
```
pt-app/
├─ index.html
├─ package.json
├─ vite.config.js
├─ api/
│  └─ claude.js          # serverfunksjon (skjuler API-nøkkelen)
├─ public/
│  └─ manifest.webmanifest
└─ src/
   ├─ main.jsx
   ├─ App.jsx            # hele appen
   └─ index.css
```

## Neste steg (når testen er positiv)
Bytt localStorage → Firebase (som i dine andre apper) for kontoer, lagring på tvers
av enheter og delte data. Da kan flere venner teste samtidig med egne profiler.
