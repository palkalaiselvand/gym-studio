FROM node:22-alpine AS build
WORKDIR /app
COPY ui/package.json ui/package-lock.json ./ui/
RUN npm ci --prefix ui
COPY ui/ ./ui/
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --prefix ui

FROM nginx:1.28-alpine
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/ui/dist /usr/share/nginx/html
EXPOSE 80
