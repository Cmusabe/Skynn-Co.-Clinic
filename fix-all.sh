#!/bin/bash
# Alles-in-één fix script voor Skynn & Co. Clinic
# Dit script doet: Railway login check → Deploy → Domain → Klaar

set -e

cd "$(dirname "$0")"

echo "🔧 Skynn & Co. Clinic - Alles Fix Script"
echo "=========================================="
echo ""

# 1. Check Railway login
echo "1️⃣  Railway login checken..."
if railway whoami &>/dev/null; then
    echo "   ✅ Ingelogd als: $(railway whoami)"
else
    echo "   ⚠️  Niet ingelogd. Start browser login..."
    railway login
    if ! railway whoami &>/dev/null; then
        echo "   ❌ Login mislukt. Probeer handmatig: railway login"
        exit 1
    fi
fi

# 2. Check project link
echo ""
echo "2️⃣  Project link checken..."
if railway status &>/dev/null; then
    echo "   ✅ Project gelinkt"
    PROJECT_EXISTS=true
else
    echo "   📦 Nieuw project aanmaken..."
    railway init --name "skynn-co-clinic" || railway link
    PROJECT_EXISTS=true
fi

# 3. Deploy
echo ""
echo "3️⃣  Deployen naar Railway..."
railway up

# 4. Wacht op deploy
echo ""
echo "4️⃣  Wachten op deploy (10 sec)..."
sleep 10

# 5. Genereer domain
echo ""
echo "5️⃣  Domein genereren..."
railway domain || echo "   ⚠️  Domein al aanwezig of mislukt"

# 6. Status
echo ""
echo "6️⃣  Finale status:"
railway status

echo ""
echo "✅ KLAAR! Je site is live op Railway!"
echo "🔗 Check Railway dashboard voor de URL: https://railway.app"
echo "   Of run: railway domain"
