FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY server server
COPY shared shared
RUN pnpm --filter @healthcare/server prisma:generate
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/server build
RUN pnpm deploy --filter @healthcare/server --prod /prod/server

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /prod/server ./
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/prisma ./prisma
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
