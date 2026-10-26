FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@10.34.7
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/content/package.json packages/content/package.json
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_SHARE_ORIGIN
ARG VITE_ONLINE_ORIGIN
# Derived assets are part of the build context; regenerate them with
# `pnpm assets:prepare` whenever the source art changes.
RUN pnpm typecheck && pnpm --filter @umbral/web build && node scripts/build-server.mjs

FROM node:24-bookworm-slim AS server
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/packages ./packages
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 2567
CMD ["node", "apps/server/dist/index.js"]

FROM nginx:1.28-alpine AS web
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY --from=build /app/assets/paladin/generated /usr/share/nginx/html/assets/paladin/generated
COPY --from=build /app/assets/guerrero/generated /usr/share/nginx/html/assets/guerrero/generated
COPY --from=build /app/assets/mago/generated /usr/share/nginx/html/assets/mago/generated
COPY --from=build /app/assets/arquera/generated /usr/share/nginx/html/assets/arquera/generated
COPY --from=build /app/assets/mapas/generated /usr/share/nginx/html/assets/mapas/generated
COPY --from=build /app/assets/enemigos/goblin/generated /usr/share/nginx/html/assets/enemigos/goblin/generated
COPY --from=build /app/assets/maestro /usr/share/nginx/html/assets/maestro
COPY --from=build /app/assets/dados /usr/share/nginx/html/assets/dados
COPY --from=build /app/assets/fuentes /usr/share/nginx/html/assets/fuentes
