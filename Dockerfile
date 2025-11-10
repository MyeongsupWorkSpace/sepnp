FROM node:18-alpine

WORKDIR /app/server

# package.json 복사 및 설치
COPY server/package*.json ./
RUN rm -rf node_modules package-lock.json
RUN npm install --production

# 나머지 파일 복사
COPY server/ ./

# 환경 변수
ENV PORT=3000
EXPOSE 3000

# 서버 시작
CMD ["node", "server.js"]