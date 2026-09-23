# Messa in sicurezza e pubblicazione

Questo documento descrive cosa fare sul database Supabase e su Vercel dopo le modifiche a prenotazioni, sessione amministrativa e API pubblica.

Lo schema analizzato è quello del 23 settembre 2026 ed è ancora **single-salone**. Non aggiungere `salon_id` alle tabelle principali finché non viene progettata la migrazione multi-tenant.

## Risultato dell'analisi

La struttura è compatibile con la nuova protezione delle prenotazioni:

- `appointments.employee_id` è `uuid`;
- `appointments.start_time` ed `end_time` sono `timestamptz`;
- `appointments.id` è `uuid`;
- `appointments.status` è `text`.

Problemi trovati nelle policy attuali:

1. `services` può essere inserita o modificata da qualunque utente Supabase autenticato, anche senza profilo dipendente attivo.
2. Alcune policy sono assegnate al ruolo `public` anche quando controllano `auth.uid()`. Non espongono necessariamente i dati, ma ampliano inutilmente la superficie dei permessi.
3. Un dipendente normale non può leggere `salon`, `salon_opening_hours` e `salon_closures`, ma l'agenda usa queste tabelle per verificare orari e chiusure.
4. Un admin può leggere solo il proprio record `employees`; di conseguenza l'agenda admin non può caricare correttamente tutto il team usando la sessione autenticata.
5. Nello schema consegnato non risultano ancora la tabella `reviews`, `appointments.booking_request_id` e `booking_rate_limits`: le relative migrazioni devono ancora essere applicate.
6. Il riepilogo ricevuto non mostra default, foreign key, indici, privilegi e trigger. Questi elementi andranno acquisiti con un dump completo prima di dichiarare lo schema interamente riproducibile.

La policy scelta nel file `core-rls.sql` rispetta il comportamento attuale dell'app:

- gli admin possono vedere tutti gli operatori e configurare categorie e salone;
- i dipendenti attivi possono gestire servizi e clienti;
- un dipendente vede e modifica soltanto i propri appuntamenti;
- un admin vede e modifica tutti gli appuntamenti;
- il sito pubblico non legge direttamente le tabelle operative: passa dalle API server.

## 1. Prima di modificare Supabase

1. Crea un backup dal pannello Supabase oppure lavora prima su un progetto di staging.
2. Non eseguire mai `supabase db reset --linked` sul database di produzione.
3. Esegui le seguenti query di controllo nel SQL Editor.

### Appuntamenti sovrapposti esistenti

La query deve restituire zero righe. Se restituisce risultati, correggi gli appuntamenti prima di installare il vincolo atomico.

```sql
select
  first_appointment.id as first_id,
  second_appointment.id as second_id,
  first_appointment.employee_id,
  first_appointment.start_time as first_start,
  first_appointment.end_time as first_end,
  second_appointment.start_time as second_start,
  second_appointment.end_time as second_end
from public.appointments first_appointment
join public.appointments second_appointment
  on first_appointment.employee_id = second_appointment.employee_id
 and first_appointment.id::text < second_appointment.id::text
 and first_appointment.status = 'scheduled'
 and second_appointment.status = 'scheduled'
 and first_appointment.start_time < second_appointment.end_time
 and first_appointment.end_time > second_appointment.start_time;
```

### Intervalli non validi

La query deve restituire zero righe.

```sql
select id, start_time, end_time
from public.appointments
where start_time is null
   or end_time is null
   or end_time <= start_time;
```

### Profili dipendente non validi

Controlla manualmente ogni riga restituita.

```sql
select id, auth_user_id, name, role, is_active
from public.employees
where auth_user_id is null
   or role is null
   or role not in ('admin', 'employee');
```

Se nel progetto usi un nome ruolo diverso da `employee`, non modificarlo alla cieca: prima aggiorna `core-rls.sql` e il codice applicativo.

### Duplicati clienti

Questi controlli non bloccano le migrazioni, ma indicano clienti che la prenotazione potrebbe associare in modo ambiguo.

```sql
select lower(email) as normalized_email, count(*)
from public.customers
where email is not null and btrim(email) <> ''
group by lower(email)
having count(*) > 1;

select phone, count(*)
from public.customers
where phone is not null and btrim(phone) <> ''
group by phone
having count(*) > 1;
```

### Più saloni

L'applicazione attuale seleziona il primo salone creato. Questa query deve restituire `0` oppure `1`.

```sql
select count(*) as salon_count from public.salon;
```

### Orari settimanali duplicati

La query deve restituire zero righe; l'upsert dell'app richiede una sola riga per salone e giorno.

```sql
select salon_id, day_of_week, count(*)
from public.salon_opening_hours
group by salon_id, day_of_week
having count(*) > 1;
```

## 2. Migrazioni da eseguire

Esegui i file nel SQL Editor di Supabase in questo ordine.

### 2.1 Policy delle tabelle principali

Esegui:

```text
supabase/core-rls.sql
```

Il file:

- abilita RLS su tutte le tabelle operative;
- introduce i controlli riutilizzabili `is_active_employee()` e `is_active_admin()`;
- elimina le policy troppo permissive o assegnate al ruolo sbagliato;
- consente agli admin di leggere il team;
- consente ai dipendenti di leggere orari e chiusure necessari all'agenda;
- revoca l'accesso diretto anonimo alle tabelle operative;
- concede agli utenti autenticati soltanto le operazioni usate dall'app, lasciando alla RLS la selezione delle righe.

Non rieseguire successivamente `supabase/service-categories.sql`: le sue policy sono sostituite da `core-rls.sql`.

### 2.2 Prenotazione atomica, idempotenza e rate limit

Esegui:

```text
supabase/booking-security.sql
```

Il file viene eseguito in una transazione e aggiunge:

- estensione `btree_gist`;
- vincolo `appointments_end_after_start`;
- vincolo di esclusione `appointments_no_scheduled_overlap`;
- colonna nullable `appointments.booking_request_id uuid`;
- indice univoco sulle chiavi idempotenti;
- tabella privata `booking_rate_limits`;
- funzione server-only `consume_booking_rate_limit`.

Il vincolo di esclusione è la garanzia atomica: fra due insert concorrenti con lo stesso addetto e intervalli sovrapposti, PostgreSQL ne accetta soltanto uno.

Se questa migrazione fallisce per righe sovrapposte, la transazione viene annullata. Correggi prima i dati mostrati dalle query del punto 1 e poi rieseguila.

### 2.3 Recensioni

Poiché `reviews` non compare nello schema consegnato, esegui:

```text
supabase/reviews.sql
```

Questa migrazione crea tabella, controlli, moderazione, privilegi e policy delle recensioni. Verifica poi che soltanto un dipendente con `role = 'admin'` possa approvare o rifiutare.

### 2.4 File già applicati

Dallo schema risultano già presenti `categories.color` e `services.is_active boolean`. Non è necessario rieseguire:

```text
supabase/category-colors.sql
supabase/services-is-active-boolean.sql
```

## 3. Verifica del database dopo le migrazioni

### Vincoli installati

```sql
select conname, contype, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.appointments'::regclass
order by conname;
```

Devono comparire almeno:

- `appointments_end_after_start`;
- `appointments_no_scheduled_overlap`.

### Colonne e tabella rate limit

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'appointments'
  and column_name = 'booking_request_id';

select to_regclass('public.booking_rate_limits') as rate_limit_table;
```

### RLS e policy finali

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Controlla che non siano rimaste queste vecchie policy:

- `Allow insert for authenticated users`;
- `Authenticated update services`;
- `Enable read access for all users`;
- `employees can update customers`;
- `Admin can "ALL" salon closures`.

## 4. Variabili Vercel

Devono essere presenti in Production e negli eventuali ambienti Preview/Staging:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BOOKING_RATE_LIMIT_SECRET
```

Regole:

- `SUPABASE_SERVICE_ROLE_KEY` e `BOOKING_RATE_LIMIT_SECRET` sono esclusivamente server-side;
- non usare mai il prefisso `NEXT_PUBLIC_` per questi due segreti;
- `BOOKING_RATE_LIMIT_SECRET` deve essere una stringa casuale lunga;
- dopo aver cambiato le variabili, esegui un nuovo deploy.

Generazione suggerita del segreto:

```bash
openssl rand -hex 32
```

## 5. Modifiche applicative già effettuate

### Sessione amministrativa

- `@supabase/ssr` salva e legge la sessione tramite cookie;
- `proxy.ts` verifica/aggiorna il token Supabase;
- il layout `/admin` verifica sul server token e dipendente attivo;
- `/admin/reviews` e `/admin/salon` richiedono anche `role = 'admin'`;
- le pagine server di clienti, servizi e categorie usano la sessione cookie e quindi rispettano la RLS;
- il vecchio controllo client non è più la barriera di sicurezza principale.

Dopo il deploy tutti gli utenti dovranno effettuare nuovamente il login perché le sessioni precedenti erano conservate con un diverso sistema nel browser.

### API pubblica di prenotazione

L'API ora applica:

- massimo 6 tentativi di creazione ogni 10 minuti per indirizzo;
- limiti separati per catalogo e ricerca slot;
- identificatore rete pseudonimizzato tramite HMAC;
- payload massimo di 8 KB;
- validazione di data, ora, nome, telefono, email e identificativi;
- finestra prenotabile di 28 giorni;
- almeno 30 minuti di anticipo;
- rimozione degli slot ormai trascorsi;
- controllo same-origin;
- messaggi pubblici che non espongono gli errori interni del database;
- chiave idempotente per doppio clic e retry;
- risposta HTTP `409` quando un'altra richiesta occupa lo slot nello stesso momento.

Se la funzione di rate limit non è installata, in produzione l'API risponde intenzionalmente `503`: non pubblicare il nuovo codice prima di aver eseguito `booking-security.sql`.

### Dipendenze

- Next.js è stato aggiornato dalla versione vulnerabile `16.1.6` alla serie `16.3.6`;
- `@supabase/ssr` è stato aggiunto;
- `temporal-polyfill` è ora una dipendenza diretta e allineata alla versione usata dal calendario;
- `npm audit --omit=dev` non segnala vulnerabilità di produzione.

## 6. Ordine di deploy

1. Crea backup o progetto staging.
2. Esegui tutte le query preliminari del punto 1.
3. Correggi eventuali sovrapposizioni o dati incoerenti.
4. Esegui `supabase/core-rls.sql`.
5. Esegui `supabase/booking-security.sql`.
6. Esegui `supabase/reviews.sql`.
7. Esegui le query di verifica del punto 3.
8. Configura le quattro variabili Vercel del punto 4.
9. Pubblica il nuovo deploy.
10. Esegui nuovamente il login con gli account admin e dipendente.
11. Completa il collaudo del punto 7.

## 7. Collaudo obbligatorio

Esegui preferibilmente questi test in staging.

### Utente anonimo

- vede servizi, categorie e operatori dal sito;
- non può interrogare direttamente `customers`, `appointments`, `employees` o `salon` con la chiave anon;
- può inviare una prenotazione valida;
- non può prenotare nel passato, oltre 28 giorni o con meno di 30 minuti di anticipo;
- riceve `409` se prova a occupare uno slot appena preso;
- può inviare una recensione, che rimane `pending` e invisibile al pubblico.

### Dipendente attivo non admin

- accede all'area admin;
- vede soltanto la propria agenda;
- può leggere orari e chiusure del salone;
- può creare/modificare clienti e servizi;
- non può aprire `/admin/salon` o `/admin/reviews`;
- non può modificare categorie né appuntamenti assegnati ad altri operatori.

### Admin

- vede tutti gli operatori e tutte le agende;
- gestisce clienti, servizi e categorie;
- configura salone, orari e chiusure;
- approva o rifiuta recensioni;
- può creare, spostare e annullare appuntamenti per qualunque operatore.

### Dipendente disattivato

- viene rifiutato dal controllo server;
- non può leggere o modificare dati tramite Supabase anche conservando un vecchio token.

### Concorrenza

Invia quasi contemporaneamente due prenotazioni per lo stesso addetto, data e ora. Il risultato corretto è:

- una risposta `201`;
- una risposta `409`;
- una sola riga `scheduled` nel database.

### Idempotenza

Ripeti la stessa richiesta con lo stesso header `Idempotency-Key`. Entrambe le risposte devono essere positive, ma nel database deve esistere un solo appuntamento con quella chiave.

## 8. Rendere lo schema completamente riproducibile

I file SQL attuali sono migrazioni parziali: non contengono la creazione iniziale di tutte le tabelle. Dopo il deploy sicuro bisogna acquisire il database remoto come baseline versionata.

Procedura raccomandata:

```bash
npx supabase login
npx supabase init
npx supabase link --project-ref <PROJECT_REF>
npx supabase db pull
npx supabase db reset
```

`db pull` deve creare una migrazione iniziale sotto `supabase/migrations/`. Prima di commetterla:

- controlla che non contenga dati cliente;
- non inserire password o chiavi API;
- verifica che includa tabelle, funzioni, trigger, indici e policy;
- prova `db reset` soltanto sul database locale.

Da quel momento ogni modifica deve essere una nuova migrazione e va applicata con `supabase db push`, prima in staging e poi in produzione.

## 9. Miglioramenti DB da decidere dopo il dump completo

Non applicare ancora automaticamente questi cambiamenti: richiedono la verifica di default, foreign key e dati esistenti che il riepilogo ricevuto non contiene.

1. Rendere `NOT NULL` nomi, date, stati, durata e chiavi esterne obbligatorie.
2. Verificare o aggiungere foreign key per appuntamenti, categorie-servizi, orari e chiusure.
3. Aggiungere check constraint per `role`, `status`, `appointment_source`, prezzi, durate e `day_of_week`.
4. Verificare il vincolo unico `(salon_id, day_of_week)` su `salon_opening_hours`.
5. Aggiungere indici per storico cliente e agenda per addetto/data.
6. Decidere se `services.price int4` rappresenta euro interi oppure centesimi. Per prezzi come `19,90` conviene `numeric(10,2)` oppure centesimi interi con conversione esplicita nell'app.
7. Normalizzare email e telefoni e decidere una strategia di deduplicazione clienti.
8. Aggiungere trigger uniformi per `updated_at`.
9. Spostare ricerca/creazione cliente e inserimento appuntamento in una singola RPC PostgreSQL, così l'intera operazione, e non soltanto l'assegnazione dello slot, diventa transazionale.
10. Quando inizierà il lavoro SaaS multi-salone, progettare `tenant_id`/`salon_id` e isolamento RLS prima di aggiungere un secondo salone.

