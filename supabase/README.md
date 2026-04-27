# Supabase fixes

Ce dossier contient les correctifs SQL lies au backoffice video ops.

## Lecture backoffice des tables video ops

Si le front admin voit `0 rows` sur `content_ideas` ou `tiktok_accounts` alors que les
tables contiennent deja des donnees, execute dans le SQL Editor Supabase :

```sql
\i supabase/rls_video_ops_read_access.sql
```

Si le SQL Editor ne supporte pas `\i`, copie-colle simplement le contenu de
[`rls_video_ops_read_access.sql`](./rls_video_ops_read_access.sql).

Ce script :

- donne `USAGE` sur le schema `public` au role `anon`
- donne `SELECT` sur `public.content_ideas` et `public.tiktok_accounts`
- cree des policies RLS de lecture pour `anon`

Attention : cela rend ces deux tables lisibles par le frontend avec la cle `anon`.
Si tu veux une version plus securisee, il faudra passer par un endpoint backend
authentifie au lieu d interroger Supabase directement depuis le navigateur.
