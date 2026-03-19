function proxy(r) {
  var body = r.requestBody;

  if (body) {
    try {
      var json = JSON.parse(body);

      if ("parallel_tool_calls" in json) {
        json.parallel_tool_calls = true;
      }

      body = JSON.stringify(json);
    } catch (e) {
      // JSON 파싱 실패 시 원본 그대로 전달
    }
  }

  r.subrequest("/v1_upstream" + r.uri.substring(3), {
    method: r.method,
    body: body
  }, function (reply) {
    r.headersOut["Content-Type"] = reply.headersOut["Content-Type"];
    r.return(reply.status, reply.responseBody);
  });
}

export default { proxy };
