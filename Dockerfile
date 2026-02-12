# Build stage
FROM node:22-alpine AS builder

RUN corepack enable pnpm

WORKDIR /app

# Cache dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source (generated API client already committed)
COPY . .

# Build the app (skip orval/prebuild - generated code is committed)
RUN npx vite build

# Runtime stage
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
