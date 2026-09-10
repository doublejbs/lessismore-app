#!/usr/bin/env bash
# 레거시(2.0.0 미만) 라이브 바이너리에 강제 업데이트 알럿 번들을 OTA로 배포한다(APP-7 레거시 전달 경로, 2026-09-10).
#
# 원리: appVersion OTA 전략은 네이티브 호환을 검증하지 않으므로, 번들을 **그 바이너리를 만든 커밋 위에서** 빌드한다.
# 커밋마다 임시 워크트리를 만들어 LegacyForceUpdateAlert.ts 를 복사하고 app/_layout.tsx 첫 줄에 부수효과 import 를
# 넣은 뒤 `hot-updater deploy -p <platform> -t <appVersion> -c production -f` 로 올린다. lockfile 이 같은 커밋들은
# node_modules 를 공유한다(워크트리 하나에서 checkout 만 바꿈). 디스크를 아끼기 위해 그룹이 끝나면 node_modules 와
# 워크트리를 지운다.
#
# Expo 53 커밋(hot-updater 0.20)은 CLI 만 0.32 로 덧입혀(--no-save) 번들 문서를 현 서버 스키마로 기록한다.
# 번들 안의 @hot-updater/react-native JS 는 그 커밋의 0.20 그대로라 바이너리의 네이티브와 짝이 맞는다.
#
# 사용: bash scripts/legacy-force-update/deploy-legacy-gate.sh <작업 디렉터리> [그룹 이름...]
#   그룹을 생략하면 전부 실행한다. 결과는 <작업 디렉터리>/summary.txt, 로그는 <작업 디렉터리>/log/*.log.
set -uo pipefail

# DRY_RUN=1 이면 워크트리·설치·배포를 건너뛰고 계획만 출력한다.
DRY_RUN="${DRY_RUN:-0}"

REPO="/Users/user/Documents/GitHub/lessismore-app"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
ALERT_SRC="$SRC_DIR/LegacyForceUpdateAlert.ts"
WORK="${1:?작업 디렉터리를 지정하세요}"
shift || true
ONLY_GROUPS=("$@")

mkdir -p "$WORK/log"
SUMMARY="$WORK/summary.txt"
touch "$SUMMARY"

# 그룹 = 같은 package-lock.json 을 가진 커밋 묶음(node_modules 공유). 한 줄에 "이름|레거시CLI(0/1)|항목".
# 항목: "<commit> <platform>:<appVersion>[,<platform>:<appVersion>...]" 를 '/' 로 이어 쓴다.
# 순서는 최신 계열(사용자가 많을 가능성)부터. macOS 기본 bash 3.2 호환을 위해 연관 배열을 쓰지 않는다.
LEGACY_GROUPS='expo57-119|0|f34eb37 ios:1.1.9
expo54-119|0|9ef0a0a android:1.1.9
expo54-117-118|0|966c64b ios:1.1.8,android:1.1.8/f7c699b ios:1.1.7/0de0976 android:1.1.7
expo54-115-116|0|d0a3b14 ios:1.1.6,android:1.1.6/b76ad89 ios:1.1.5/441577e android:1.1.5
expo53-105-107|1|04935a9 ios:1.0.7,android:1.0.7/ef6e45c ios:1.0.6,ios:1.0.5,android:1.0.5
expo53-104|1|24db7c1 ios:1.0.4/1b822f8 android:1.0.4
expo53-102-103|1|93dcd44 android:1.0.3/664b337 android:1.0.2'

log() {
  printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

record() {
  printf '%s\t%s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*" >> "$SUMMARY"
}

should_run_group() {
  local name="$1"

  if [ ${#ONLY_GROUPS[@]} -eq 0 ]; then
    return 0
  fi

  for g in "${ONLY_GROUPS[@]}"; do
    if [ "$g" = "$name" ]; then
      return 0
    fi
  done

  return 1
}

link_env() {
  local wt="$1"
  local key_file

  ln -sf "$REPO/.env.hotupdater" "$wt/.env.hotupdater"
  key_file="$(grep -E '^GOOGLE_APPLICATION_CREDENTIALS=' "$REPO/.env.hotupdater" | cut -d= -f2- | sed 's#^\./##')"

  if [ -n "$key_file" ] && [ -f "$REPO/$key_file" ]; then
    ln -sf "$REPO/$key_file" "$wt/$key_file"
  fi
}

apply_patch() {
  local wt="$1"

  mkdir -p "$wt/model/legacy-update"
  cp "$ALERT_SRC" "$wt/model/legacy-update/LegacyForceUpdateAlert.ts"

  if ! grep -q "legacy-update/LegacyForceUpdateAlert" "$wt/app/_layout.tsx"; then
    printf "import '../model/legacy-update/LegacyForceUpdateAlert';\n%s" "$(cat "$wt/app/_layout.tsx")" > "$wt/app/_layout.tsx.tmp"
    mv "$wt/app/_layout.tsx.tmp" "$wt/app/_layout.tsx"
  fi
}

revert_patch() {
  local wt="$1"

  git -C "$wt" checkout -- app/_layout.tsx
  rm -rf "$wt/model/legacy-update"
}

deploy_one() {
  local wt="$1" commit="$2" platform="$3" version="$4"
  local logfile="$WORK/log/deploy-$platform-$version-$commit.log"
  local msg="강제 업데이트 안내(레거시 $platform $version, base $commit) — 2.0.0 스토어 업데이트 유도"

  log "deploy $platform $version ($commit)"

  if [ "$DRY_RUN" = "1" ]; then
    record "DRY	$platform	$version	$commit	-"
    return
  fi

  if (cd "$wt" && npx hot-updater deploy -p "$platform" -t "$version" -c production -f -m "$msg" < /dev/null) > "$logfile" 2>&1; then
    local bundle
    bundle="$(tr '\r' '\n' < "$logfile" | grep -oE 'Deployment Successful \([0-9a-f-]+\)' | grep -oE '[0-9a-f-]{36}' | tail -1)"
    record "OK	$platform	$version	$commit	${bundle:-?}"
    log "  -> OK ${bundle:-?}"
  else
    record "FAIL	$platform	$version	$commit	see $logfile"
    log "  -> FAIL (see $logfile)"
  fi
}

run_group() {
  local name="$1" legacy_cli="$2" items="$3" wt="$WORK/wt-$name"
  local first_commit install_log="$WORK/log/install-$name.log"

  first_commit="$(printf '%s' "$items" | cut -d'/' -f1 | cut -d' ' -f1)"
  log "=== group $name (first commit $first_commit) ==="

  if [ "$DRY_RUN" = "1" ]; then
    local entry commit pairs pair platform version
    IFS='/' read -r -a entries <<< "$items"

    for entry in "${entries[@]}"; do
      commit="${entry%% *}"
      pairs="${entry#* }"
      IFS=',' read -r -a pair_list <<< "$pairs"

      for pair in "${pair_list[@]}"; do
        deploy_one "-" "$commit" "${pair%%:*}" "${pair#*:}"
      done
    done

    return
  fi

  rm -rf "$wt"
  git -C "$REPO" worktree prune
  if ! git -C "$REPO" worktree add --detach "$wt" "$first_commit" < /dev/null > /dev/null 2>&1; then
    record "FAIL	group	$name	$first_commit	worktree add 실패"
    return
  fi

  link_env "$wt"

  log "npm ci ($name)"
  if ! (cd "$wt" && npm ci --no-audit --no-fund --loglevel=error < /dev/null) > "$install_log" 2>&1; then
    log "npm ci 실패 → npm install 재시도"
    if ! (cd "$wt" && npm install --no-audit --no-fund --loglevel=error < /dev/null) >> "$install_log" 2>&1; then
      record "FAIL	group	$name	$first_commit	npm install 실패 (see $install_log)"
      cleanup_group "$wt"
      return
    fi
  fi

  if [ "$legacy_cli" = "1" ]; then
    log "hot-updater CLI 0.32 덧입히기 ($name)"
    if ! (cd "$wt" && npm install --no-save --no-audit --no-fund --loglevel=error hot-updater@0.32.0 @hot-updater/expo@0.32.0 @hot-updater/firebase@0.32.0 < /dev/null) >> "$install_log" 2>&1; then
      record "FAIL	group	$name	$first_commit	0.32 CLI 설치 실패 (see $install_log)"
      cleanup_group "$wt"
      return
    fi
  fi

  local entry commit pairs pair platform version
  IFS='/' read -r -a entries <<< "$items"

  for entry in "${entries[@]}"; do
    commit="${entry%% *}"
    pairs="${entry#* }"

    if [ "$(git -C "$wt" rev-parse --short HEAD)" != "$(git -C "$REPO" rev-parse --short "$commit")" ]; then
      if ! git -C "$wt" checkout --detach "$commit" > /dev/null 2>&1; then
        record "FAIL	group	$name	$commit	checkout 실패"
        continue
      fi
    fi

    apply_patch "$wt"

    IFS=',' read -r -a pair_list <<< "$pairs"
    for pair in "${pair_list[@]}"; do
      platform="${pair%%:*}"
      version="${pair#*:}"
      deploy_one "$wt" "$commit" "$platform" "$version"
    done

    revert_patch "$wt"
  done

  cleanup_group "$wt"
}

cleanup_group() {
  local wt="$1"

  rm -rf "$wt/node_modules" "$wt/dist" "$wt/.expo"
  git -C "$REPO" worktree remove --force "$wt" > /dev/null 2>&1 || rm -rf "$wt"
  git -C "$REPO" worktree prune
}

# 그룹 줄을 배열로 먼저 읽는다 — 루프 안의 npm/npx/git 이 표준입력(here-string)을 삼키지 않게.
GROUP_LINES=()
while IFS= read -r line; do
  if [ -n "$line" ]; then
    GROUP_LINES+=("$line")
  fi
done <<< "$LEGACY_GROUPS"

for line in "${GROUP_LINES[@]}"; do
  name="${line%%|*}"
  rest="${line#*|}"
  legacy_cli="${rest%%|*}"
  items="${rest#*|}"

  if should_run_group "$name"; then
    run_group "$name" "$legacy_cli" "$items"
  fi
done

log "=== 완료 — 결과: $SUMMARY ==="
cat "$SUMMARY"
