FROM node:18-alpine

WORKDIR /app

# 서버 의존성 설치
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# 소스 복사
COPY server ./server
COPY sepnp-portal ./sepnp-portal

# 포트 노출
EXPOSE 3000

# 실행
CMD ["node", "server/server.js"]