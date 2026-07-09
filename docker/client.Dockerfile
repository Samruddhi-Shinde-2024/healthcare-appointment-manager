FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/package.json
COPY shared/package.json shared/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY client client
COPY shared shared
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/client build

FROM nginx:1.27-alpine AS runner
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/client/dist /usr/share/nginx/html
EXPOSE 80
