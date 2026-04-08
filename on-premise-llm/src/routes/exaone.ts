// Exaone 라우터 - Friendli (Exaone) API 프록시

import { Router } from 'express';
import { proxyRequest, transformBody } from '../utils/proxy';
import type { ProxyResponseCallback } from '../utils/proxy';
import { logger } from '../utils/logger';
import type { ProxyConfig, TransformOptions, BodyTransformer } from '../types';

const router = Router();

// Exaone 프록시 대상 설정
const config: ProxyConfig = {
  hostname: 'api.friendli.ai',
  port: 443,
  basePath: '/serverless/v1',
};

// Exaone 전용 body 변환 규칙
const transformOpts: TransformOptions = {
  overrides: [
    { action: 'set', key: 'parse_reasoning' , value: false},
  ],
};

// Exaone 전용 body 변환 함수
const exaoneTransform: BodyTransformer = (rawBody) =>
  transformBody(rawBody, transformOpts);

// 요청 로깅 미들웨어
router.use((req, _res, next) => {
  logger.info(`[Exaone] ${req.method} ${req.originalUrl}`);
  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    logger.debug(`[Exaone] request body: ${req.body.toString()}`);
  }
  next();
});

// 응답 로깅 콜백
const logResponse: ProxyResponseCallback = (statusCode, responseBody) => {
  logger.info(`[Exaone] response status: ${statusCode}`);
  logger.debug(`[Exaone] response body: ${responseBody}`);
};

// /exaone/v1/models - 모델 목록 조회 (body 변환 없이 그대로 프록시)
router.all('/v1/models', (req, res) => {
  proxyRequest(config, req, res, req.body, logResponse);
});

// /exaone/v1/chat/completions - 채팅 완성 (body 변환 적용)
router.all('/v1/chat/completions', (req, res) => {
  const body = exaoneTransform(req.body);
  proxyRequest(config, req, res, body, logResponse);
});

export { router as exaoneRouter };
