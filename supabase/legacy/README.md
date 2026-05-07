# Legacy SQL files

Archivio dei 56 file SQL applicati direttamente via Supabase SQL Editor
**prima** dell'introduzione di Supabase CLI come migration tool.

## Perché sono qui

Pre-CLI, ogni schema change era uno script SQL libero che eseguivi a mano nel
Studio. Ottimo per velocità, pessimo per tracciabilità (chi ha eseguito cosa,
in che ordine, su quale environment).

Da oggi le migration nuove vanno in `../migrations/<timestamp>_<name>.sql`
gestite via:

```bash
supabase migration new <nome>     # crea file
supabase db push                  # applica al remote linkato
```

## Quando consultare questi file

- Onboarding nuovo dev: leggere in ordine cronologico per capire l'evoluzione
  dello schema.
- Disaster recovery: ricreare un DB greenfield da zero applicando questi nei
  nomi originali.
- Riferimento storico: capire perché una colonna è stata aggiunta/droppata.

## NON eseguirli più

Lo schema attuale del DB linkato è già il risultato dell'applicazione di tutti
questi file. Il file `../migrations/<timestamp>_remote_schema.sql` (generato
da `supabase db pull`) ne è la rappresentazione canonica corrente.
