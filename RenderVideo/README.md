# RenderVideo

Service de rendu video vertical pour la migration `Remotion + FFmpeg`.

## API

### `GET /health`

Retourne l'etat du service et la liste des templates.

### `GET /templates`

Liste les templates disponibles avec leur description.

### `POST /render`

Accepte un payload conforme a:

- `Backend/tools/contracts/render-video-job.schema.json`

Retourne:

```json
{
  "ok": true,
  "engine": "remotion",
  "renderId": "remotion-123-456-...",
  "status": "rendered",
  "templateId": "tiktok-pro-vertical",
  "compositionId": "tiktok-pro-vertical",
  "outputUrl": "http://localhost:8090/renders/remotion-123-456.mp4",
  "thumbnailUrl": "http://localhost:8090/renders/remotion-123-456.jpg",
  "qualityProfile": "premium",
  "audioMixed": true,
  "loudnessNormalized": true
}
```

## Templates premium (Phase 4)

`render.templateId` selectionne le template visuel:

- `tiktok-pro-vertical` (defaut): hook badge + lignes script + CTA, palette par categorie.
- `tiktok-bold-story`: typographie display italique, chapitres numerotes, CTA degrade, sous-titres mot-par-mot.
- `tiktok-clean-minimal`: minimaliste, capsule discrete, sous-titres bandeau central.
- `tiktok-pro-vertical-v1`: alias retrocompatible vers `tiktok-pro-vertical`.

Tous les templates respectent les safe zones TikTok officielles, derivees automatiquement de la largeur du rendu (720 ou 1080) et surchargeable via `render.safeZones`.

La palette utilisee est derivee de `idea.category` (puis `idea.visualStyle` en fallback). Categories reconnues: `business`, `finance`, `tech`, `lifestyle`, `fitness`, `food`, `beauty`, `education`, `travel`, `entertainment`. Tout le reste retombe sur la palette par defaut.

## Sous-titres

`render.captionMode` controle le rendu:

- `none`: pas de sous-titres
- `line`: ligne courante (defaut)
- `word`: mot courant
- `karaoke`: tous les mots, mot courant surligne

Les pistes sont prises de `assets.captions[]` quand presentes, sinon le service derive automatiquement des sous-titres en decoupant `idea.script`.

## Post-process FFmpeg (Phase 5)

Apres le rendu Remotion, le service applique automatiquement un pipeline FFmpeg:

- mux audio: `assets.voiceover.url` + `assets.music.url` (le second au volume `assets.music.volume`, defaut 0.18)
- normalisation EBU R128 (`loudnorm` cible `I=-14`, `TP=-1.5`, `LRA=11`) si une piste audio est presente
- ré-encodage `libx264` + `aac` 48 kHz stereo, `pix_fmt yuv420p`, `+faststart` pour streaming TikTok
- thumbnail JPG generee a 0.5s

### Profils de qualite (`render.qualityProfile`)

| Profil    | Preset    | CRF | maxrate  | Audio   |
|-----------|-----------|-----|----------|---------|
| draft     | veryfast  | 28  | 4.5 Mbps | 96 kbps |
| standard  | fast      | 24  | 6.5 Mbps | 128 kbps|
| high      | medium    | 21  | 8.5 Mbps | 160 kbps|
| premium   | slow      | 19  | 10 Mbps  | 192 kbps|

`FFMPEG_BIN_PATH` permet de surcharger le binaire ffmpeg (defaut: `ffmpeg-static`).

## Scripts

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run type-check`
- `node scripts/smoke-templates.mjs` (smoke test selectComposition pour les 3 templates)
- `node scripts/smoke-postprocess.mjs` (smoke test mux audio + loudnorm + thumbnail)

## Variables d'environnement

- `PORT`: port HTTP, defaut `8090`
- `RENDER_VIDEO_SCHEMA_PATH`: chemin du contrat JSON
- `RENDER_VIDEO_OUTPUT_DIR`: dossier de sortie MP4
- `RENDER_VIDEO_PUBLIC_BASE_URL`: base URL publique pour les fichiers rendus
- `REMOTION_ENTRY`: entrypoint Remotion optionnel
- `FFMPEG_BIN_PATH`: chemin custom du binaire ffmpeg (sinon ffmpeg-static)
