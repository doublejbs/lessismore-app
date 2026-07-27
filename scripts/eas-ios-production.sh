#!/usr/bin/env bash
# iOS 프로덕션 빌드 (HealthKit entitlement 반영 프로필 재생성 포함)
#
# 사용 전제: Apple 인증을 아래 둘 중 하나로 제공해야 한다.
#   (A) app-specific password 방식 — 비대화(자동):
#       export EXPO_APPLE_ID="you@example.com"
#       export EXPO_APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"   # appleid.apple.com 에서 발급
#       (이 값들은 사용자가 직접 설정한다. Claude는 인증 크레덴셜을 넣지 않는다.)
#   (B) 대화형 로그인 — 위 env 없이 실행하면 EAS가 Apple 로그인(2FA)을 프롬프트한다.
#
# App ID(com.doublejbs.useless)에 HealthKit capability는 이미 켜져 있어야 한다(웹에서 완료).
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -n "${EXPO_APPLE_ID:-}" && -n "${EXPO_APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
  echo "[eas] app-specific password 감지 — 비대화 빌드로 진행합니다."
  exec npx eas-cli build --platform ios --profile production --non-interactive
else
  echo "[eas] Apple env 없음 — 대화형 빌드로 진행합니다(로그인 2FA 필요)."
  exec npx eas-cli build --platform ios --profile production
fi
