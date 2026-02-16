#!/bin/bash
# Volledige Railway deploy script
# Run dit NA railway login

set -e

cd "$(dirname "$0")"

echo "🚂 Railway Deploy Script voor Skynn & Co. Clinic"
echo "================================================"

# Check Railway login
if ! railway whoami &>/dev/null; then
    echo "❌ Niet ingelogd op Railway. Run eerst: railway login"
    exit 1
fi

echo "✅ Railway ingelogd als: $(railway whoami)"

# Check of project al gelinkt is
if railway status &>/dev/null; then
    echo "✅ Project al gelinkt"
    PROJECT_LINKED=true
else
    echo "📦 Project nog niet gelinkt..."
    PROJECT_LINKED=false
fi

# Link of maak nieuw project
if [ "$PROJECT_LINKED" = false ]; then
    echo ""
    echo "Kies een optie:"
    echo "1) Link aan bestaand Railway project"
    echo "2) Maak nieuw Railway project"
    read -p "Keuze (1 of 2): " choice
    
    if [ "$choice" = "1" ]; then
        railway link
    elif [ "$choice" = "2" ]; then
        echo "📦 Nieuw project aanmaken..."
        railway init
    else
        echo "❌ Ongeldige keuze"
        exit 1
    fi
fi

# Deploy
echo ""
echo "🚀 Deployen naar Railway..."
railway up

# Wacht even voor deploy
echo ""
echo "⏳ Wachten op deploy..."
sleep 5

# Genereer domain
echo ""
echo "🌐 Domein genereren..."
railway domain || echo "⚠️  Domein generatie mislukt of al aanwezig"

# Status
echo ""
echo "✅ Deploy voltooid!"
echo ""
echo "📊 Status:"
railway status

echo ""
echo "🔗 Je site is live op Railway!"
echo "Run 'railway domain' voor de URL, of check Railway dashboard"
