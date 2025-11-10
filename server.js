const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// sepnp-portal 폴더를 정적 파일로 제공
app.use(express.static(path.join(__dirname, 'sepnp-portal')));

// 모든 경로를 index.html로 리다이렉트 (SPA 지원)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'sepnp-portal', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});