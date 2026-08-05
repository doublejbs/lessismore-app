#!/bin/bash
# iOS 프로덕션 .ipa를 App Store Connect에 올린다.
#
# EAS는 제출 인증 정보를 `eas.json`에서만 읽는다(환경변수 EXPO_ASC_* 는 이 CLI 버전에서
# 무시된다 — 2026-08-04 확인). 그런데 키 식별자를 커밋하고 싶지는 않으므로, 실행 시점에
# `.env.submit`(gitignore 대상)의 값으로 `eas.json`을 임시 패치하고 끝나면 되돌린다.
#
# 사용법: submit.sh <ipa 경로>
set -euo pipefail

IPA_PATH="${1:?사용법: submit.sh <ipa 경로>}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

cd "$ROOT"

if [ ! -f "$IPA_PATH" ]; then
  echo "실패: .ipa를 찾을 수 없다 — $IPA_PATH" >&2
  exit 1
fi

if [ ! -f .env.submit ]; then
  echo "실패: .env.submit이 없다. 스킬 문서의 '최초 1회 준비'를 참고할 것." >&2
  exit 1
fi

# `.env.submit`은 값이 따옴표로 감싸여 있어 그대로 읽을 수 있다(`$HOME`도 펼쳐진다).
# `source <(...)`는 macOS 기본 bash 3.2에서 조용히 아무것도 정의하지 않는다 — 쓰지 않는다.
set -a
# shellcheck disable=SC1091
. ./.env.submit
set +a

if [ ! -r "$ASC_API_KEY_PATH" ]; then
  echo "실패: API 키 파일을 읽을 수 없다 — $ASC_API_KEY_PATH" >&2
  echo "      iCloud 경로면 파일이 로컬에 내려와 있는지 확인할 것." >&2
  exit 1
fi

# 원본 보존 후 임시 패치. 중단되어도 되돌아가도록 trap을 건다.
BACKUP="$(mktemp)"
cp eas.json "$BACKUP"
trap 'cp "$BACKUP" eas.json; rm -f "$BACKUP"' EXIT

node -e "
const fs = require('fs');
const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
easJson.submit.production.ios.ascApiKeyPath = process.env.ASC_API_KEY_PATH;
easJson.submit.production.ios.ascApiKeyId = process.env.ASC_KEY_ID;
easJson.submit.production.ios.ascApiKeyIssuerId = process.env.ASC_ISSUER_ID;
fs.writeFileSync('eas.json', JSON.stringify(easJson, null, 2) + '\n');
"

npx eas-cli submit --platform ios --profile production --path "$IPA_PATH" --non-interactive
