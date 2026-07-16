FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS development
ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["node", "server.js"]
