// Upstage 라우터 - Upstage API 프록시

import { Router } from 'express';
import { proxyRequest, transformBody } from '../utils/proxy';
import type { ProxyResponseCallback } from '../utils/proxy';
import { logger } from '../utils/logger';
import type { ProxyConfig, TransformOptions, BodyTransformer } from '../types';

const router = Router();

// Upstage 프록시 대상 설정
const config: ProxyConfig = {
  hostname: 'api.upstage.ai',
  port: 443,
  basePath: '/v1',
};

// Upstage 전용 body 변환 규칙
// Upstage는 parallel_tool_calls를 처리하지 못하므로 해당 키를 제거
const transformOpts: TransformOptions = {
  overrides: [
    { action: 'remove', key: 'parallel_tool_calls' },
    { action: 'set', key: 'tool_choice', value: 'required' },
  ],
};

// Upstage 전용 body 변환 함수
const upstageTransform: BodyTransformer = (rawBody) =>
  transformBody(rawBody, transformOpts);

// 요청 로깅 미들웨어
router.use((req, _res, next) => {
  logger.info(`[Upstage] ${req.method} ${req.originalUrl}`);
  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    logger.debug(`[Upstage] request body: ${req.body.toString()}`);
  }
  next();
});

// 응답 로깅 콜백
const logResponse: ProxyResponseCallback = (statusCode, responseBody) => {
  logger.info(`[Upstage] response status: ${statusCode}`);
  logger.debug(`[Upstage] response body: ${responseBody}`);
};

// /upstage/v1/models - 모델 목록 조회 (body 변환 없이 그대로 프록시)
router.all('/v1/models', (req, res) => {
  proxyRequest(config, req, res, req.body, logResponse);
});

// /upstage/v1/embeddings - 임베딩 (body 변환 없이 그대로 프록시)
router.all('/v1/embeddings', (req, res) => {
  proxyRequest(config, req, res, req.body, logResponse);
});

// /upstage/v1/chat/completions - 채팅 완성 (body 변환 적용)
router.all('/v1/chat/completions', (req, res) => {
  const body = upstageTransform(req.body);
  proxyRequest(config, req, res, body, logResponse);
});

export { router as upstageRouter };
