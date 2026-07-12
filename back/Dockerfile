FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY back/package.json ./back/
COPY front/package.json ./front/
RUN npm ci
COPY shared ./shared
COPY back ./back
RUN npm run build -w @datashare/shared \
  && npm run prisma:generate -w @datashare/back \
  && npm run build -w @datashare/back

WORKDIR /app/back
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
