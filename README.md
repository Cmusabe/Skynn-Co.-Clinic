# Skynn & Co. Clinic

Production-ready static site voor Skynn & Co. Clinic in Apeldoorn.

## 🚀 Quick Start

### 1. Railway Login (éénmalig)

```bash
railway login
# Volg de browser instructies
```

### 2. Alles Fixen (automatisch)

```bash
./fix-all.sh
```

Dit script doet:
- ✅ Check Railway login
- ✅ Maakt/linkt Railway project
- ✅ Deployt naar Railway
- ✅ Genereert domein
- ✅ Toont status

### 3. Of Handmatig

```bash
railway init          # Nieuw project
railway up            # Deploy
railway domain        # Genereer URL
```

## 📁 Project Structuur

- `server.js` - Express static server voor Railway
- `package.json` - Node dependencies
- `railway.toml` - Railway config
- `DEPLOY.md` - Volledige deploy documentatie

## 🔗 Links

- **GitHub:** https://github.com/Cmusabe/Skynn-Co.-Clinic
- **Railway Dashboard:** https://railway.app

## 🛠️ Lokaal Testen

```bash
npm install
npm start
# Open http://localhost:3000
```

## 📝 Notes

- Supabase config: vul `supabase-config.js` in met je credentials
- Environment vars: zet in Railway dashboard → Variables
- Domain: genereer via Railway dashboard of `railway domain`
