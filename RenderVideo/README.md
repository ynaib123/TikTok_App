# RenderVideo

Service de rendu video vertical pour la migration `Remotion + FFmpeg`.

## API

### `GET /health`

Retourne l'etat du service.

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
  "outputUrl": "http://localhost:8090/renders/remotion-123-456.mp4"
}
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run type-check`

## Variables d'environnement

- `PORT`: port HTTP, defaut `8090`
- `RENDER_VIDEO_SCHEMA_PATH`: chemin du contrat JSON
- `RENDER_VIDEO_OUTPUT_DIR`: dossier de sortie MP4
- `RENDER_VIDEO_PUBLIC_BASE_URL`: base URL publique pour les fichiers rendus
- `REMOTION_ENTRY`: entrypoint Remotion optionnel
