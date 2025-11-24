# Dockerfile (production, multi-stage)

# Stage 1: Dependencies & Build
FROM node:20-alpine AS deps
WORKDIR /app

# Install build tools if you use Sharp or other native packages
# RUN apk add --no-cache build-base libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci --production=false

COPY . .
RUN npm run build

# Stage 2: Production Image
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -S nextgroup && adduser -S nextuser -G nextgroup

COPY --from=deps /app/package.json /app/package-lock.json* ./
COPY --from=deps /app/.next ./.next
COPY --from=deps /app/public ./public
COPY --from=deps /app/next.config.mjs ./  

RUN npm ci --production=true

USER nextuser

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
