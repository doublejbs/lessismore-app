// 모델 공급자(AS-1). 서버 응답 `provider`를 다음 요청에 그대로 돌려준다.
enum AssistantProvider {
  Anthropic = 'anthropic',
  Gemini = 'gemini',
}

export default AssistantProvider;
