#!/bin/bash
# Android 프로덕션 .aab를 Google Play에 올린다.
#
# EAS는 제출 인증 정보를 `eas.json`에서만 읽는다(iOS와 같은 제약 — ios-release 스킬 참고).
# 서비스 계정 키 경로를 커밋하고 싶지 않으므로, 실행 시점에 `.env.submit`(gitignore 대상)의
# 값으로 `eas.json`을 임시 패치하고 끝나면 되돌린다.
#
# 사용법: submit.sh <aab 경로> [트랙]
#   트랙 기본값은 `internal`(내부 테스트). production으로 올릴 때만 명시한다.
set -euo pipefail

AAB_PATH="${1:?사용법: submit.sh <aab 경로> [트랙]}"
TRACK="${2:-internal}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

cd "$ROOT"

if [ ! -f "$AAB_PATH" ]; then
  echo "실패: .aab를 찾을 수 없다 — $AAB_PATH" >&2
  exit 1
fi

if [ ! -f .env.submit ]; then
  echo "실패: .env.submit이 없다. 스킬 문서의 '최초 1회 준비'를 참고할 것." >&2
  exit 1
fi

# `source <(...)`는 macOS 기본 bash 3.2에서 조용히 아무것도 정의하지 않는다 — 쓰지 않는다.
set -a
# shellcheck disable=SC1091
. ./.env.submit
set +a

if [ -z "${PLAY_SERVICE_ACCOUNT_KEY_PATH:-}" ]; then
  echo "실패: .env.submit에 PLAY_SERVICE_ACCOUNT_KEY_PATH가 없다." >&2
  exit 1
fi

if [ ! -r "$PLAY_SERVICE_ACCOUNT_KEY_PATH" ]; then
  echo "실패: 서비스 계정 키를 읽을 수 없다 — $PLAY_SERVICE_ACCOUNT_KEY_PATH" >&2
  echo "      iCloud 경로면 파일이 로컬에 내려와 있는지 확인할 것." >&2
  exit 1
fi

# 원본 보존 후 임시 패치. 중단되어도 되돌아가도록 trap을 건다.
BACKUP="$(mktemp)"
cp eas.json "$BACKUP"
trap 'cp "$BACKUP" eas.json; rm -f "$BACKUP"' EXIT

TRACK="$TRACK" node -e "
const fs = require('fs');
const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
easJson.submit.production.android = {
  serviceAccountKeyPath: process.env.PLAY_SERVICE_ACCOUNT_KEY_PATH,
  track: process.env.TRACK,
};
fs.writeFileSync('eas.json', JSON.stringify(easJson, null, 2) + '\n');
"

echo "트랙: $TRACK"
npx eas-cli submit --platform android --profile production --path "$AAB_PATH" --non-interactive
