This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Recensioni

1. Configura `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` e nell'ambiente Vercel.
2. Esegui `supabase/reviews.sql` nel SQL Editor del progetto Supabase **prima** di pubblicare le nuove pagine. Il file crea tabella, vincoli, indice, trigger, permessi e policy RLS; può essere rieseguito.
3. Verifica che `public.employees` abbia le colonne `auth_user_id`, `is_active` e `role`, e che l'account moderatore abbia `role = 'admin'` e `is_active = true`.

Il visitatore invia una recensione da `/reviews/new`. Il database la crea sempre con stato `pending`; il visitatore non può leggerla o modificarla dopo l'invio. Un admin la approva o la rifiuta in `/admin/reviews`. Solo le recensioni approvate appaiono nella home e in `/reviews`. Il trigger registra data e utente della moderazione. Le regole sono nel database: nascondere il link admin nell'interfaccia non sostituisce le policy RLS.

Controllo consigliato dopo la migrazione: invia una recensione senza accesso, verifica che non appaia nella pagina pubblica, approvala con un account admin e verifica che appaia; prova anche il rifiuto e un accesso con dipendente non admin. Prima di un lancio su larga scala conviene proteggere anche questo form con CAPTCHA o rate limiting dedicato.

## Sicurezza prenotazioni

Prima di pubblicare l'API di prenotazione, esegui `supabase/booking-security.sql` nel SQL Editor. La migrazione aggiunge:

- il blocco atomico delle sovrapposizioni per lo stesso addetto;
- una chiave idempotente per non duplicare i retry;
- il rate limit condiviso tra tutte le istanze serverless.

Configura anche `SUPABASE_SERVICE_ROLE_KEY` soltanto nell'ambiente server di Vercel. È consigliata una variabile server `BOOKING_RATE_LIMIT_SECRET` lunga e casuale; se assente viene usata la service-role come segreto HMAC. Non usare mai il prefisso `NEXT_PUBLIC_` per queste due variabili.

La finestra pubblica consente prenotazioni nei prossimi 28 giorni, con almeno 30 minuti di anticipo. I limiti sono definiti in `app/api/booking/route.ts`.

## Email di conferma prenotazione

Le prenotazioni online con un indirizzo email inviano un riepilogo tramite l'API transazionale di Brevo, dopo il salvataggio dell'appuntamento. Configura sul server:

- `BREVO_API_KEY`: chiave API di Brevo, mai con prefisso `NEXT_PUBLIC_`;
- `BREVO_SENDER_EMAIL`: indirizzo mittente verificato in Brevo;
- `BREVO_EMAIL_MODE`: `test` per inviare solo all'indirizzo di prova, `live` per inviare al cliente;
- `BREVO_SENDER_NAME`: nome visualizzato come mittente (facoltativo);
- `BREVO_TEST_RECIPIENT`: indirizzo che riceve tutte le conferme quando `BREVO_EMAIL_MODE=test` (obbligatorio in modalità test, con oggetto `[TEST]`).

In assenza della chiave, del mittente o di una modalità esplicita, la prenotazione continua a funzionare senza inviare email. Un errore di invio non annulla una prenotazione già salvata; i retry della stessa richiesta non inviano una seconda email. Prima di impostare `BREVO_EMAIL_MODE=live`, verifica il dominio mittente in Brevo e prova una prenotazione con un indirizzo controllato da te.

## Sessione amministrativa

La sessione Supabase è salvata in cookie e aggiornata da `proxy.ts`, così può essere verificata anche nei Server Component. Il layout `/admin` verifica sul server sia il token sia l'esistenza di un dipendente attivo; le policy RLS del database restano comunque obbligatorie per autorizzare ogni lettura e modifica.

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
