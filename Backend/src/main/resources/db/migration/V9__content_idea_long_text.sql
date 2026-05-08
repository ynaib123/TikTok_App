-- Élargir les colonnes texte de content_ideas pour accepter des scripts /
-- captions / topics produits par les LLM (TikTok scripts pro = 200-2000 chars
-- typiquement). Le contrat render-video accepte déjà jusqu'à 4000 chars pour
-- script, 2200 pour caption, 240 pour topic — la DB doit suivre.

ALTER TABLE content_ideas ALTER COLUMN topic TYPE varchar(500);
ALTER TABLE content_ideas ALTER COLUMN scripts TYPE text;
ALTER TABLE content_ideas ALTER COLUMN caption TYPE varchar(2200);
ALTER TABLE content_ideas ALTER COLUMN background_keyword TYPE varchar(500);
