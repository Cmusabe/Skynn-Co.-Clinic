# Supabase Setup

1. Maak een Supabase project aan.
2. Open SQL Editor en run `/Users/c/Documents/beautysalon/supabase/schema.sql`.
3. Open `/Users/c/Documents/beautysalon/supabase-config.js`.
4. Vul in:
   - `window.__SUPABASE_URL__`
   - `window.__SUPABASE_ANON_KEY__`
5. Herlaad de site.
6. Open `/Users/c/Documents/beautysalon/admin.html` en log in met pincode `1234`.
7. Wijzig data en klik opslaan. Status moet tonen: `Supabase`.

## Wat is gekoppeld

- Admin panel leest config uit Supabase (fallback lokaal).
- Admin panel schrijft config naar Supabase (fallback lokaal bij fout).
- Boekingspopup leest de nieuwste config, inclusief staff, diensten en beschikbaarheid.
- Tarievenpagina neemt prijzen over uit admin-data (op basis van dienstnaam-match).

## Belangrijk

De policies in `schema.sql` zijn open voor `anon` write. Dit is niet veilig voor productie.
Voor productie: gebruik Supabase Auth + restrictieve RLS policies of een backend endpoint.
