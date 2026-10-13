FROM node:22-alpine AS build
WORKDIR /app
COPY api/package.json api/package-lock.json ./api/
RUN npm ci --prefix api
COPY api/ ./api/
COPY database/seeds/ ./database/seeds/
RUN npm run build --prefix api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=5000 DATA_DIR=/data
ARG APP_UID=1000
ARG APP_GID=1000
WORKDIR /app
COPY api/package.json api/package-lock.json ./api/
RUN npm ci --omit=dev --prefix api && npm cache clean --force
COPY --from=build /app/api/dist ./api/dist
COPY api/scripts/ ./api/scripts/
COPY --from=build /app/database/seeds ./database/seeds
RUN mkdir -p /data /backups && chown -R ${APP_UID}:${APP_GID} /data /backups
WORKDIR /app/api
USER ${APP_UID}:${APP_GID}
EXPOSE 5000
CMD ["node", "dist/server.js"]
