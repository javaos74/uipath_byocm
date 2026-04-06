// Express 앱 진입점 - HTTP/HTTPS 듀얼 모드 프록시 서버

import express from 'express';
import https from 'https';
import fs from 'fs';
import { clovaxRouter } from './routes/clovax';
import { upstageRouter } from './routes/upstage';

const app = express();
const PORT = process.env.PORT || 8080;

// raw body 파싱 (JSON 변환 전 원본 Buffer 유지)
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// 라우터 마운트
app.use('/clovax', clovaxRouter);
app.use('/upstage', upstageRouter);

// TLS 환경변수 확인
const tlsCert = process.env.TLS_CERT;
const tlsKey = process.env.TLS_KEY;

if (tlsCert && tlsKey) {
  // HTTPS 서버 기동
  try {
    const tlsOptions = {
      cert: fs.readFileSync(tlsCert),
      key: fs.readFileSync(tlsKey),
    };
    https.createServer(tlsOptions, app).listen(PORT, () => {
      console.log(`HTTPS 프록시 서버 실행 중: :${PORT}`);
    });
  } catch (err) {
    console.error('TLS 인증서 파일 읽기 실패:', err);
    process.exit(1);
  }
} else {
  // HTTP 서버 기동 (기본)
  app.listen(PORT, () => {
    console.log(`HTTP 프록시 서버 실행 중: :${PORT}`);
  });
}
