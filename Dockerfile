# Container build for Glama, which runs the server to verify it starts and to
# let users deploy it. Builds from source rather than pulling the published npm
# package, so the image matches the commit being tested.

FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first: this layer is cached unless the manifests change.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Reinstall without dev dependencies. tsc and tsx are build-time only and would
# otherwise ship in the runtime image.
RUN npm ci --omit=dev


FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# The server speaks JSON-RPC over stdio. It must not run as root, and it must
# not write anything to stdout that is not a protocol message.
USER node

ENTRYPOINT ["node", "dist/index.js"]
