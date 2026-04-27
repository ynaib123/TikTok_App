# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_SHOP_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SHOP_URL=${VITE_SHOP_URL}
RUN npm run build

# --- run stage ---
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
