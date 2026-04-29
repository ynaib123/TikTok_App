# Video Ops State Machine

## Canonical stages

The backend now treats these stages as the single product-level source of truth:

1. `CREATION_REQUESTED`
2. `IDEA_CREATED`
3. `SCRIPT_REQUESTED`
4. `SCRIPT_READY`
5. `RENDERING_REQUESTED`
6. `RENDER_READY`
7. `UPLOAD_PREPARING`
8. `PUBLISH_INITIALIZED`
9. `UPLOAD_COMPLETED`
10. `PUBLISHED`
11. `FAILED`

## Workflow mapping

- `MAIN_PIPELINE`:
  - requested -> `CREATION_REQUESTED`
  - success -> `IDEA_CREATED`
- `CHECK_SHOTSTACK`:
  - requested -> `SCRIPT_REQUESTED`
  - success -> `SCRIPT_READY`
- `RENDER_TEMPLATE_VIDEO`:
  - requested -> `RENDERING_REQUESTED`
  - success -> `RENDER_READY`
- `INIT_PUBLISH_TIKTOK`:
  - requested -> `UPLOAD_PREPARING`
  - success -> `PUBLISH_INITIALIZED`
- `TIKTOK_UPLOAD`:
  - requested -> `PUBLISH_INITIALIZED`
  - success -> `UPLOAD_COMPLETED`
- `FINALIZE_PUBLISH`:
  - requested/success -> `PUBLISHED`

## External signal resolution

The backend also derives a stage from vendor signals when it reloads a `content_idea`:

- TikTok `publish_status=published` -> `PUBLISHED`
- TikTok `publish_status in (uploaded, uploading)` -> `UPLOAD_COMPLETED`
- presence of `tiktok_upload_url` -> `PUBLISH_INITIALIZED`
- Shotstack `status=done` or final video ready -> `RENDER_READY`
- Shotstack `status in (queued, rendering, preprocessing, preparing)` -> `RENDERING_REQUESTED`

## Callback contract

Preferred callback auth is now HMAC:

- `X-Video-Ops-Callback-Timestamp`
- `X-Video-Ops-Callback-Signature`

Canonical string:

```text
<HTTP_METHOD>
<REQUEST_PATH>
<ISO_TIMESTAMP>
<BASE64_SHA256_OF_BODY>
```

Legacy `X-Video-Ops-Callback-Secret` is still accepted while `APP_VIDEO_OPS_ALLOW_LEGACY_WORKFLOW_CALLBACK_SECRET=true`.
