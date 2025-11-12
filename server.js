const express = require('express');
const path = require('path');
const app = express();

// Railway가 넘겨주는 포트만 사용 (fallback 제거)
const PORT = process.env.PORT;

app.get('/health', (req, res) => res.status(200).send('OK')); // 헬스체크
app.get('/', (req, res) => res.status(200).send('ROOT OK'));  // 루트도 200

// 정적/라우트 ... (필요시)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`STARTED on ${PORT}`);
});