# Portail Presty V5

Base unique inspirée du CRM GHR : Next.js App Router, état JSON centralisé dans Supabase, migrations automatiques non destructives.

## Installation
1. Exécuter `supabase-setup.sql` une seule fois dans Supabase SQL Editor.
2. Ajouter dans Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_SESSION_SECRET`
   - `GHL_WEBHOOK_SECRET`
3. Importer le repository dans Vercel.
4. Ouvrir l’application : le premier écran crée le compte administrateur.

## Comptes
L’administrateur crée les comptes instituts depuis l’application. Les mots de passe sont hachés avec scrypt et les sessions sont placées dans un cookie HTTP-only signé.
