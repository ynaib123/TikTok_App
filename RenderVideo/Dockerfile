FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libgbm1 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
      xdg-utils \
    && rm -rf /var/lib/apt/lists/*

COPY RenderVideo/package*.json ./
RUN npm ci

COPY RenderVideo ./
COPY Backend/tools/contracts /contracts

ENV PORT=8090
ENV RENDER_VIDEO_SCHEMA_PATH=/contracts/render-video-job.schema.json
ENV RENDER_VIDEO_OUTPUT_DIR=/app/renders

RUN npm run build

EXPOSE 8090

CMD ["npm", "start"]
