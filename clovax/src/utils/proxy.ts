// 공통 프록시 유틸

import https from 'https';
import type { Request, Response } from 'express';
import { ProxyConfig, TransformOptions } from '../types';

/**
 * 대상 서버의 전체 경로를 생성합니다.
 * requestPath에서 "/v1" 접두사를 제거하고 basePath와 결합합니다.
 *
 * 예: basePath="/v1/openai", requestPath="/v1/chat/completions" → "/v1/openai/chat/completions"
 * 예: basePath="/v1", requestPath="/v1/chat/completions" → "/v1/chat/completions"
 */
export function buildTargetPath(basePath: string, requestPath: string): string {
  // requestPath에서 "/v1" 접두사(3글자)를 제거하고 basePath와 결합
  return basePath + requestPath.substring(3);
}

/**
 * 요청 body를 옵션에 따라 변환합니다.
 * - 유효한 JSON이고 overrides에 지정된 키가 존재하면 해당 값으로 덮어씁니다
 * - 비JSON body 또는 빈 Buffer는 원본 그대로 반환
 */
export function transformBody(rawBody: Buffer, options: TransformOptions): Buffer {
  // 빈 body는 그대로 반환
  if (rawBody.length === 0) {
    return rawBody;
  }

  try {
    const json = JSON.parse(rawBody.toString());

    // overrides 배열에 지정된 규칙을 적용
    for (const override of options.overrides) {
      if (override.key in json) {
        if (override.action === 'set') {
          json[override.key] = override.value;
        } else if (override.action === 'remove') {
          delete json[override.key];
        }
      }
    }

    return Buffer.from(JSON.stringify(json));
  } catch {
    // JSON 파싱 실패 시 원본 반환
    return rawBody;
  }
}

/**
 * 대상 서버로 HTTPS 프록시 요청을 전송합니다.
 * - host 헤더를 config.hostname으로 교체
 * - content-length를 body 길이로 갱신
 * - 대상 서버 응답을 pipe()로 클라이언트에 스트리밍 전달
 * - 에러 발생 시 502 Bad Gateway 반환 (헤더 미전송 시), 헤더 전송 완료 시 연결 종료
 */
export function proxyRequest(
  config: ProxyConfig,
  req: Request,
  res: Response,
  body: Buffer
): void {
  // body가 Buffer가 아닌 경우 빈 Buffer로 대체 (GET 요청 등 body 없는 경우)
  const safeBody = Buffer.isBuffer(body) ? body : Buffer.alloc(0);
  const targetPath = buildTargetPath(config.basePath, req.path);

  // 클라이언트 헤더를 복사하고 host와 content-length를 갱신
  const headers = { ...req.headers, host: config.hostname };
  headers['content-length'] = String(safeBody.length);

  const proxyReq = https.request(
    {
      hostname: config.hostname,
      port: config.port,
      path: targetPath,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      // 대상 서버의 상태 코드와 헤더를 클라이언트에 전달
      res.writeHead(proxyRes.statusCode!, proxyRes.headers);
      // 응답 본문을 버퍼링 없이 스트리밍 전달
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502);
    }
    res.end('Bad Gateway');
  });

  proxyReq.end(safeBody);
}
