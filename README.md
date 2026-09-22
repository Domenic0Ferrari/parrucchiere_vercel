This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Recensioni

1. Configura `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` e nell'ambiente Vercel.
2. Esegui `supabase/reviews.sql` nel SQL Editor del progetto Supabase **prima** di pubblicare le nuove pagine. Il file crea tabella, vincoli, indice, trigger, permessi e policy RLS; può essere rieseguito.
3. Verifica che `public.employees` abbia le colonne `auth_user_id`, `is_active` e `role`, e che l'account moderatore abbia `role = 'admin'` e `is_active = true`.

Il visitatore invia una recensione da `/reviews/new`. Il database la crea sempre con stato `pending`; il visitatore non può leggerla o modificarla dopo l'invio. Un admin la approva o la rifiuta in `/admin/reviews`. Solo le recensioni approvate appaiono nella home e in `/reviews`. Il trigger registra data e utente della moderazione. Le regole sono nel database: nascondere il link admin nell'interfaccia non sostituisce le policy RLS.

Controllo consigliato dopo la migrazione: invia una recensione senza accesso, verifica che non appaia nella pagina pubblica, approvala con un account admin e verifica che appaia; prova anche il rifiuto e un accesso con dipendente non admin. L'invio pubblico può generare spam nella coda: se serve un limite ai tentativi, aggiungere un controllo server con CAPTCHA o rate limiting prima del lancio su larga scala.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
