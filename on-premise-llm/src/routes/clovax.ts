// Clovax 라우터 - clovastudio API 프록시

import { Router } from 'express';
import { proxyRequest, transformBody } from '../utils/proxy';
import { logger } from '../utils/logger';
import type { ProxyConfig, TransformOptions, BodyTransformer } from '../types';

const router = Router();

// Clovax 프록시 대상 설정
const config: ProxyConfig = {
  hostname: 'clovastudio.stream.ntruss.com',
  port: 443,
  basePath: '/v1/openai',
};

// Clovax 전용 body 변환 규칙
// ClovaX 백엔드에서 parallel_tool_calls, tool_choice 처리 이슈를 프록시 단에서 보정
const transformOpts: TransformOptions = {
  overrides: [
    { action: 'set', key: 'parallel_tool_calls', value: true },
    { action: 'set', key: 'tool_choice', value: 'auto' },
  ],
};

// Clovax 전용 body 변환 함수
const clovaxTransform: BodyTransformer = (rawBody) =>
  transformBody(rawBody, transformOpts);

// 요청 로깅 미들웨어
router.use((req, _res, next) => {
  logger.info(`[ClovaX] ${req.method} ${req.originalUrl}`);
  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    logger.debug(`[ClovaX] request body: ${req.body.toString()}`);
  }
  next();
});

// /clovax/v1/models - 모델 목록 조회 (body 변환 없이 그대로 프록시)
router.all('/v1/models', (req, res) => {
  proxyRequest(config, req, res, req.body);
});

// /clovax/v1/embeddings - 임베딩 (body 변환 없이 그대로 프록시)
router.all('/v1/embeddings', (req, res) => {
  proxyRequest(config, req, res, req.body);
});

// /clovax/v1/chat/completions - 채팅 완성 (body 변환 적용)
router.all('/v1/chat/completions', (req, res) => {
  const body = clovaxTransform(req.body);
  proxyRequest(config, req, res, body);
});

export { router as clovaxRouter };
