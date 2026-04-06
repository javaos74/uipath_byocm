# === 빌드 스테이지 ===
FROM node:22-alpine AS builder
WORKDIR /app

# 의존성 설치 (Docker 레이어 캐싱 활용)
COPY package.json package-lock.json ./
RUN npm ci

# TypeScript 소스 복사 및 빌드
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# === 런타임 스테이지 ===
FROM node:22-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

# 프로덕션 의존성만 설치
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 빌드된 JavaScript 복사
COPY --from=builder /app/dist ./dist

RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 8080
CMD ["node", "dist/app.js"]
