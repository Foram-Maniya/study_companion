# ── Stage 1: Build the Vite production bundle ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Vite inlines VITE_* variables at build time (not runtime).
# These ARGs are supplied via `docker build --build-arg` or docker-compose build.args.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Install dependencies first (better layer caching when only source changes).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# ── Stage 2: Serve static assets with Nginx ──────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default site config; we ship our own.
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
