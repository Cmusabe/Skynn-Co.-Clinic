# Skynn & Co. Clinic – Deploy naar Railway & GitHub

## 1. Railway CLI installeren

**macOS (Homebrew):**
```bash
brew install railway
```

**npm (alle platformen):**
```bash
npm install -g @railway/cli
```

**Of direct download:** https://docs.railway.app/develop/cli

Controle:
```bash
railway --version
railway login
```

---

## 2. Project lokaal klaarzetten

```bash
cd /Users/c/Documents/beautysalon
npm install
npm start
# Open http://localhost:3000
```

---

## 3. Git & GitHub

**Eerst op GitHub:** maak een nieuw repository aan op https://github.com/new (bijv. `Skynn-Co`), **zonder** README/license/gitignore (lege repo).

Daarna lokaal:

```bash
cd /pad/naar/beautysalon
git init
git add .
git commit -m "Production ready: static server, Railway config, .gitignore"
git branch -M main
git remote add origin git@github.com:Cmusabe/Skynn-Co.-Clinic.git
git push -u origin main
```

Als je SSH gebruikt (zoals nu):
```bash
git remote add origin git@github.com:Cmusabe/Skynn-Co.-Clinic.git
git push -u origin main
```

Als de repo al bestond en niet leeg is:
```bash
git pull origin main --rebase
# of: git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 4. Deploy op Railway

**Optie A – Via GitHub (aanbevolen)**

1. Ga naar https://railway.app en log in.
2. **New Project** → **Deploy from GitHub repo**.
3. Kies **Cmusabe/Skynn-Co.-Clinic** (en autoriseer Railway als dat gevraagd wordt).
4. Railway detecteert Node + `npm start`; deploy start automatisch.
5. **Settings** → **Generate Domain** om een URL te krijgen.

**Optie B – Via CLI**

```bash
cd /Users/c/Documents/beautysalon
railway login
railway init          # kies bestaand project of maak nieuw
railway link          # koppel aan project als dat nog niet is gedaan
railway up            # deploy huidige map
railway domain        # genereer een domein
```

**Of via Railway dashboard:**
1. Ga naar https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Kies **Cmusabe/Skynn-Co.-Clinic**
3. Railway detecteert automatisch Node + `npm start`
4. **Settings** → **Generate Domain** voor een URL
```

---

## 5. Environment variables (Railway)

In Railway: **Project** → **Variables**.

- Voor Supabase: vul in productie `supabase-config.js` met je echte URL en anon key, of zet ze in Railway vars en pas de app aan om ze client-side te gebruiken (bijv. via een klein build script).
- `PORT` wordt door Railway gezet; niet handmatig invullen.

---

## 6. Na elke wijziging

```bash
git add .
git commit -m "Beschrijving van de wijziging"
git push origin main
```

Bij **Deploy from GitHub** bouwt Railway automatisch opnieuw na elke push op `main`.
