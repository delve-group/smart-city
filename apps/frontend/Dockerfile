FROM node:24.13.1-bookworm-slim AS dependencies
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 npm ci --no-audit --no-fund --loglevel=http

FROM dependencies AS development
ENV NEXT_TELEMETRY_DISABLED=1
COPY --chown=node:node . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

FROM development AS build
RUN npm run build

FROM build AS production
ENV NODE_ENV=production
CMD ["npm", "start", "--", "--hostname", "0.0.0.0"]
