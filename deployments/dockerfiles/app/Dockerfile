FROM node:16-alpine AS build

WORKDIR /app

ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV:-production}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run server:build
RUN npm run client:build

FROM node:16-alpine
WORKDIR /app
COPY . .
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/public/dist ./public/dist
EXPOSE 8080
CMD [ "/bin/sh","-c","ln -s ./configuration/.env ./.env && node ./server/dist"]
