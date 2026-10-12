import { Acg } from '@/constants/DesignTokens';
import { MAP_STYLE_URL } from '@/model/map/MapStyle';
import { ROUTE_COLOR } from '@/model/route/RouteColors';

/**
 * `maplibre-gl` 버전 — 문서에 고정한다(RR §4). cdnjs에 있는 5.x 마지막 버전(2026-10-12 확인).
 * 올릴 때는 `setTerrain`·`setSky`·`queryTerrainElevation`·`Marker` API 호환을 확인한다.
 */
const MAPLIBRE_VERSION = '5.24.0';
const MAPLIBRE_BASE_URL = `https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/${MAPLIBRE_VERSION}`;
/**
 * 하위 자원 무결성(SRI) — CDN 파일이 바뀌면 브라우저가 실행하지 않는다(→ `script` 실패로 빈 상태).
 * 버전을 올리면 다시 계산한다: `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`
 * (2026-10-12 계산, cdnjs API의 sha512와 대조 확인).
 */
const MAPLIBRE_JS_INTEGRITY =
  'sha384-5+cfbwT0iiub6VsQAdn6yz16nr6sDiQoHx6tm4O8OVYXHYOxcffFmCJBL0dgdvGp';
const MAPLIBRE_CSS_INTEGRITY =
  'sha384-uTttxo/aOKbdE5RlD/SPzSDoDmNvGlUYPjONi2MN/b7c9HPSvW07OIuyP7uL6jxK';

/** 웹뷰가 문서의 출처로 삼는 주소 — 스타일과 같은 호스트라 상대 경로·CORS가 꼬이지 않는다. */
export const ROUTE_REPLAY_BASE_URL = 'https://lessismore-7e070.web.app';

// 앱 토큰을 문서에 그대로 옮긴다 — 웹뷰 안에서도 같은 잉크·라임·컨트롤 면이다(HM-8).
const INK = Acg.ink;
const LIME = Acg.lime;
const CONTROL_FILL = Acg.controlFill;

/**
 * 3D 코스 리플레이 웹뷰 문서(RR-2). 앱 번들 안의 문자열이라 호스팅 없이 OTA로 고칠 수 있다.
 *
 * - 스크립트는 템플릿 리터럴과 충돌하지 않게 **백틱과 달러-중괄호를 쓰지 않는다**(문자열 연결만).
 * - 문구는 하나도 박지 않는다 — RN이 `load`의 `labels`로 넘긴다(l10n).
 * - 메시지 계약은 `RouteReplayMessage.ts`.
 */
export const ROUTE_REPLAY_HTML: string = String.raw`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<link rel="stylesheet" href="${MAPLIBRE_BASE_URL}/maplibre-gl.css" integrity="${MAPLIBRE_CSS_INTEGRITY}" crossorigin="anonymous">
<style>
  :root {
    --ink: ${INK};
    --lime: ${LIME};
    --control-fill: ${CONTROL_FILL};
    --panel-h: 0px;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #FFFFFF;
    font-family: -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    color: var(--ink);
  }
  #map { position: absolute; top: 0; right: 0; bottom: 0; left: 0; }
  /* 출처 표기(ⓘ)를 컨트롤 면 위로 올린다 — 가리면 표기 의무를 못 지킨다(OF-6). */
  .maplibregl-ctrl-bottom-right, .maplibregl-ctrl-bottom-left {
    bottom: calc(var(--panel-h) + 16px + env(safe-area-inset-bottom));
  }
  button { font: inherit; color: inherit; border: 0; background: none; padding: 0; margin: 0; cursor: pointer; }
  .panel {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: calc(12px + env(safe-area-inset-bottom));
    box-sizing: border-box;
    padding: 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.92);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    box-shadow: 0 6px 20px rgba(26, 26, 26, 0.12);
    display: none;
  }
  .panel.visible { display: block; }
  .row { display: flex; align-items: center; gap: 12px; }
  .row + .row { margin-top: 8px; }
  .play {
    flex: none;
    min-height: 44px;
    min-width: 44px;
    padding: 0 18px;
    border-radius: 999px;
    background: var(--lime);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
  }
  .play svg { width: 16px; height: 16px; fill: var(--ink); }
  .progress { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
  .stat {
    font-size: 13px;
    line-height: 18px;
    letter-spacing: 0.1px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  input[type=range] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 28px;
    margin: 0;
    background: transparent;
  }
  input[type=range]::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(to right, var(--ink) 0, var(--ink) var(--fill, 0%), rgba(26, 26, 26, 0.14) var(--fill, 0%));
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    margin-top: -8px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 2px solid var(--ink);
    box-sizing: border-box;
  }
  .speeds { display: flex; gap: 6px; flex: 1; }
  .chip {
    min-height: 44px;
    min-width: 44px;
    padding: 0 12px;
    border-radius: 10px;
    background: var(--control-fill);
    color: var(--ink);
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .chip[aria-checked="true"] { background: var(--ink); color: #FFFFFF; }
  .fit {
    min-height: 44px;
    padding: 0 4px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
    text-decoration: underline;
  }
  /* 출발·도착 글자 말풍선(GRP-8): 출발 = 잉크 면 흰 글자, 도착 = 흰 면 잉크 테두리. */
  .bubble {
    position: relative;
    display: inline-block;
    width: max-content;
    margin-bottom: 8px;
    padding: 4px 9px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(26, 26, 26, 0.16);
  }
  .bubble::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: -5px;
    width: 8px;
    height: 8px;
    margin-left: -5px;
    transform: rotate(45deg);
  }
  .bubble.start { background: var(--ink); color: #FFFFFF; border: 1.5px solid var(--ink); }
  .bubble.start::after { background: var(--ink); border-right: 1.5px solid var(--ink); border-bottom: 1.5px solid var(--ink); }
  .bubble.end { background: #FFFFFF; color: var(--ink); border: 1.5px solid var(--ink); }
  .bubble.end::after { background: #FFFFFF; border-right: 1.5px solid var(--ink); border-bottom: 1.5px solid var(--ink); }
  /* 포인트: 유형색 원 + 흰 테두리 + 아래 이름. 원의 중심이 좌표다. */
  .point { position: relative; width: 14px; height: 14px; }
  .point .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid #FFFFFF;
    box-sizing: border-box;
    box-shadow: 0 1px 4px rgba(26, 26, 26, 0.3);
  }
  .point .label {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    line-height: 16px;
    font-weight: 600;
    color: var(--ink);
    text-shadow: 0 0 2px #FFFFFF, 0 0 2px #FFFFFF, 0 0 3px #FFFFFF;
  }
  /* 진행 마커: 흰 테두리 잉크 점. */
  .cursor {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--ink);
    border: 2px solid #FFFFFF;
    box-sizing: content-box;
    box-shadow: 0 1px 6px rgba(26, 26, 26, 0.35);
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="panel" class="panel">
  <div class="row">
    <button id="play" class="play" type="button">
      <svg id="playIcon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>
      <span id="playLabel"></span>
    </button>
    <div class="progress">
      <div id="stat" class="stat" aria-live="off"></div>
      <input id="range" type="range" min="0" max="1000" step="1" value="0">
    </div>
  </div>
  <div class="row">
    <div id="speeds" class="speeds" role="radiogroup"></div>
    <button id="fit" class="fit" type="button"></button>
  </div>
</div>
<script src="${MAPLIBRE_BASE_URL}/maplibre-gl.js" integrity="${MAPLIBRE_JS_INTEGRITY}" crossorigin="anonymous"></script>
<script>
(function () {
  var STYLE_URL = "${MAP_STYLE_URL}";
  var ROUTE_COLOR = "${ROUTE_COLOR}";
  var EXAGGERATION = 1.3;
  var FOLLOW_PITCH = 58;
  var FOLLOW_ZOOM = 14.5;
  var LOOK_AHEAD_M = 120;
  var BEARING_WINDOW_M = 200;
  var BEARING_SMOOTHING = 0.1;
  var SECONDS_PER_KM = 4;
  var MIN_SECONDS = 20;
  var MAX_SECONDS = 120;
  var FOLLOW_EASE_MS = 1000;
  var RANGE_MAX = 1000;
  var PAUSE_PATH = "M4 2.5h3v11H4zM9 2.5h3v11H9z";
  var PLAY_PATH = "M4 2.5v11l9-5.5z";

  var errored = false;
  var ready = false;
  var loaded = false;
  var map = null;

  var post = function (message) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  };

  var fail = function (message) {
    if (errored) {
      return;
    }

    errored = true;
    post({ type: "error", message: String(message) });
  };

  var hasWebGL = function () {
    try {
      var canvas = document.createElement("canvas");

      return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch (error) {
      return false;
    }
  };

  if (typeof maplibregl === "undefined") {
    fail("script");

    return;
  }

  if (!hasWebGL() || (typeof maplibregl.supported === "function" && !maplibregl.supported())) {
    fail("webgl");

    return;
  }

  // ── 경로 기하 ──
  var toRad = function (deg) { return deg * Math.PI / 180; };
  var toDeg = function (rad) { return rad * 180 / Math.PI; };

  var haversine = function (a, b) {
    var dLat = toRad(b[1] - a[1]);
    var dLng = toRad(b[0] - a[0]);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
  };

  var bearingBetween = function (a, b) {
    var lat1 = toRad(a[1]);
    var lat2 = toRad(b[1]);
    var dLng = toRad(b[0] - a[0]);
    var y = Math.sin(dLng) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };

  var coords = [];
  var cumulative = [];
  var totalDistance = 0;
  var bounds = null;

  // 누적 거리 d(m) 지점의 좌표와 기록 고도(없으면 null).
  var locate = function (d) {
    var target = Math.max(0, Math.min(totalDistance, d));
    var low = 0;
    var high = cumulative.length - 1;

    while (low < high - 1) {
      var mid = (low + high) >> 1;

      if (cumulative[mid] <= target) {
        low = mid;
      } else {
        high = mid;
      }
    }

    var a = coords[low];
    var b = coords[Math.min(high, coords.length - 1)];
    var span = cumulative[high] - cumulative[low];
    var ratio = span > 0 ? (target - cumulative[low]) / span : 0;
    var hasEle = typeof a[2] === "number" && typeof b[2] === "number";

    return {
      lngLat: [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio],
      ele: hasEle ? a[2] + (b[2] - a[2]) * ratio : null
    };
  };

  // ── 재생 상태 ──
  var progress = 0;
  var playing = false;
  var following = false;
  var speed = 1;
  var smoothedBearing = null;
  var lastFrameAt = 0;
  var easingUntil = 0;
  var frameId = 0;
  var labels = null;
  var cursorMarker = null;
  var scrubbing = false;
  var fitTimer = 0;

  var panel = document.getElementById("panel");
  var playButton = document.getElementById("play");
  var playIconPath = document.querySelector("#playIcon path");
  var playLabel = document.getElementById("playLabel");
  var stat = document.getElementById("stat");
  var range = document.getElementById("range");
  var speedsBox = document.getElementById("speeds");
  var fitButton = document.getElementById("fit");

  var durationMs = function () {
    var seconds = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, (totalDistance / 1000) * SECONDS_PER_KM));

    return (seconds * 1000) / speed;
  };

  var formatElevation = function (ele) {
    return Math.round(ele).toLocaleString("en-US") + "m";
  };

  var formatDistance = function (meters) {
    if (meters < 1000) {
      return Math.round(meters) + "m";
    }

    return (meters / 1000).toFixed(1) + "km";
  };

  var elevationAt = function (spot) {
    if (spot.ele !== null) {
      return spot.ele;
    }

    try {
      var terrain = map.queryTerrainElevation(spot.lngLat);

      // 지형 과장이 곱해진 값이 온다 — 실제 해발로 되돌린다.
      return typeof terrain === "number" ? terrain / EXAGGERATION : null;
    } catch (error) {
      return null;
    }
  };

  var updatePlayButton = function () {
    // 재생 중이라도 따라가기가 풀렸으면 "재생"을 보여 준다 — 누르면 다시 따라간다(RR-2).
    var showPause = playing && following;
    var label = labels ? (showPause ? labels.pause : labels.play) : "";

    playIconPath.setAttribute("d", showPause ? PAUSE_PATH : PLAY_PATH);
    playLabel.textContent = label;
    playButton.setAttribute("aria-label", label);
  };

  var updateProgressUi = function () {
    var d = progress * totalDistance;
    var spot = locate(d);
    var ele = elevationAt(spot);

    if (cursorMarker) {
      cursorMarker.setLngLat(spot.lngLat);
    }

    if (!scrubbing) {
      range.value = String(Math.round(progress * RANGE_MAX));
    }

    range.style.setProperty("--fill", (progress * 100).toFixed(2) + "%");
    stat.textContent = (ele !== null ? formatElevation(ele) + " · " : "") + formatDistance(d);

    return spot;
  };

  var followCamera = function (d) {
    var ahead = locate(d + LOOK_AHEAD_M).lngLat;
    var from = locate(Math.max(0, d - BEARING_WINDOW_M)).lngLat;
    var to = locate(d < BEARING_WINDOW_M ? Math.min(totalDistance, BEARING_WINDOW_M) : d).lngLat;
    var target = haversine(from, to) > 1 ? bearingBetween(from, to) : (smoothedBearing || 0);

    if (smoothedBearing === null) {
      smoothedBearing = target;
    } else {
      var diff = ((target - smoothedBearing + 540) % 360) - 180;

      smoothedBearing = (smoothedBearing + diff * BEARING_SMOOTHING + 360) % 360;
    }

    // 중심점의 지형 고도를 카메라에 함께 준다. 주지 않으면 MapLibre가 중심을 해발 0m로 두어, 오르막에서
    // 산 위에 그려지는 마커가 매 프레임 조금씩 화면 위로 밀리다 사라진다(2026-10-12 실기기 지적 → 헤드리스
    // 재현: 중심 투영 y 345→328px 드리프트, 고도를 넘기자 380px 고정). 과장(EXAGGERATION)이 곱해진 값이
    // 그려지는 지면 높이이므로 그대로 넘긴다(되돌리지 않는다).
    var aheadElevation = null;

    try {
      aheadElevation = map.queryTerrainElevation(ahead);
    } catch (error) {
      aheadElevation = null;
    }

    var camera = {
      center: ahead,
      bearing: smoothedBearing,
      pitch: FOLLOW_PITCH,
      zoom: FOLLOW_ZOOM,
      // 하단 컨트롤 면만큼 아래를 비워 마커가 보이는 영역의 가운데 근처에 오게 한다.
      padding: { top: 0, right: 0, left: 0, bottom: panel.offsetHeight }
    };

    if (typeof aheadElevation === "number") {
      camera.elevation = aheadElevation;
    }

    return camera;
  };

  var panelPadding = function () {
    return { top: 60, right: 60, left: 60, bottom: 60 + panel.offsetHeight };
  };

  var lngLatBounds = function () {
    return new maplibregl.LngLatBounds(bounds[0], bounds[1]);
  };

  // 전체 보기 — 경로 전체가 들어오는 카메라로 돌아가 기울인다.
  var fitAll = function (animated) {
    following = false;
    updatePlayButton();

    var camera = map.cameraForBounds(lngLatBounds(), { padding: panelPadding() });

    if (!camera) {
      return;
    }

    // 기울이면 먼 쪽이 화면 위로 밀려나므로 한 단 덜 당긴다.
    map.easeTo({
      center: camera.center,
      zoom: Math.max(0, (camera.zoom || 0) - 0.3),
      bearing: 0,
      pitch: 55,
      duration: animated ? 1500 : 0
    });
  };

  var stop = function () {
    playing = false;

    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    updatePlayButton();
  };

  var tick = function (now) {
    frameId = 0;

    if (!playing) {
      return;
    }

    // 따라가기로 들어가는 이징 동안은 시계를 세우지 않는다.
    if (now < easingUntil) {
      lastFrameAt = now;
      frameId = requestAnimationFrame(tick);

      return;
    }

    var dt = lastFrameAt ? Math.min(100, now - lastFrameAt) : 0;

    lastFrameAt = now;

    if (!scrubbing) {
      progress = Math.min(1, progress + dt / durationMs());
    }

    updateProgressUi();

    if (following) {
      map.jumpTo(followCamera(progress * totalDistance));
    }

    if (progress >= 1) {
      stop();
      post({ type: "finished" });
      clearTimeout(fitTimer);
      fitTimer = setTimeout(function () { fitAll(true); }, 600);

      return;
    }

    frameId = requestAnimationFrame(tick);
  };

  var startFollowing = function () {
    following = true;
    smoothedBearing = null;
    clearTimeout(fitTimer);

    var camera = followCamera(progress * totalDistance);

    map.easeTo(Object.assign({}, camera, { duration: FOLLOW_EASE_MS }));
    easingUntil = performance.now() + FOLLOW_EASE_MS;
  };

  var play = function () {
    if (progress >= 1) {
      progress = 0;
    }

    playing = true;
    lastFrameAt = 0;
    startFollowing();
    updatePlayButton();
    post({ type: "play", speed: speed });

    if (!frameId) {
      frameId = requestAnimationFrame(tick);
    }
  };

  var handlePressPlay = function () {
    if (!loaded) {
      return;
    }

    if (playing && following) {
      stop();

      return;
    }

    if (playing) {
      // 재생 중 손으로 움직여 풀린 따라가기를 되돌린다(재생은 계속).
      startFollowing();
      updatePlayButton();

      return;
    }

    play();
  };

  var renderSpeeds = function () {
    speedsBox.innerHTML = "";
    speedsBox.setAttribute("aria-label", labels.speedHint);

    (labels.speeds || []).forEach(function (option) {
      var chip = document.createElement("button");

      chip.type = "button";
      chip.className = "chip";
      chip.setAttribute("role", "radio");
      chip.setAttribute("aria-checked", option.value === speed ? "true" : "false");
      chip.textContent = option.label;
      chip.addEventListener("click", function () {
        speed = option.value;

        Array.prototype.forEach.call(speedsBox.children, function (child) {
          child.setAttribute("aria-checked", child === chip ? "true" : "false");
        });
      });
      speedsBox.appendChild(chip);
    });
  };

  // ── 마커 ──
  // 마커 요소는 MapLibre가 position: absolute로 옮긴다 — 위치 스타일은 안쪽 요소에만 준다.
  var bubbleElement = function (text, kind) {
    var element = document.createElement("div");
    var bubble = document.createElement("div");

    bubble.className = "bubble " + kind;
    bubble.textContent = text;
    element.appendChild(bubble);

    return element;
  };

  var pointElement = function (point) {
    var element = document.createElement("div");
    var body = document.createElement("div");
    var dot = document.createElement("div");
    var label = document.createElement("div");

    body.className = "point";
    element.appendChild(body);
    dot.className = "dot";
    dot.style.background = point.color || "#767676";
    label.className = "label";
    label.textContent = point.title || "";
    body.appendChild(dot);
    body.appendChild(label);

    return element;
  };

  var applyLoad = function (message) {
    if (loaded || !ready) {
      return;
    }

    coords = (message.coordinates || []).filter(function (c) {
      return c && typeof c[0] === "number" && typeof c[1] === "number" && isFinite(c[0]) && isFinite(c[1]);
    });

    if (coords.length < 2) {
      fail("coordinates");

      return;
    }

    loaded = true;
    labels = message.labels || { start: "", end: "", play: "", pause: "", fit: "", speedHint: "", progress: "", speeds: [] };

    cumulative = [0];

    for (var i = 1; i < coords.length; i += 1) {
      cumulative.push(cumulative[i - 1] + haversine(coords[i - 1], coords[i]));
    }

    totalDistance = cumulative[cumulative.length - 1];

    var west = Infinity;
    var south = Infinity;
    var east = -Infinity;
    var north = -Infinity;

    coords.forEach(function (c) {
      west = Math.min(west, c[0]);
      east = Math.max(east, c[0]);
      south = Math.min(south, c[1]);
      north = Math.max(north, c[1]);
    });
    bounds = [[west, south], [east, north]];

    map.addSource("replay-route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords.map(function (c) { return [c[0], c[1]]; }) }
      }
    });
    map.addLayer({
      id: "replay-route-casing",
      type: "line",
      source: "replay-route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#FFFFFF", "line-width": 10 }
    });
    map.addLayer({
      id: "replay-route-line",
      type: "line",
      source: "replay-route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ROUTE_COLOR, "line-width": 6 }
    });

    (message.points || []).forEach(function (point) {
      if (typeof point.lng !== "number" || typeof point.lat !== "number") {
        return;
      }

      new maplibregl.Marker({ element: pointElement(point), anchor: "top", offset: [0, -7] })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
    });

    new maplibregl.Marker({ element: bubbleElement(labels.end, "end"), anchor: "bottom" })
      .setLngLat([coords[coords.length - 1][0], coords[coords.length - 1][1]])
      .addTo(map);
    new maplibregl.Marker({ element: bubbleElement(labels.start, "start"), anchor: "bottom" })
      .setLngLat([coords[0][0], coords[0][1]])
      .addTo(map);

    var cursor = document.createElement("div");

    cursor.className = "cursor";
    cursorMarker = new maplibregl.Marker({ element: cursor, anchor: "center" })
      .setLngLat([coords[0][0], coords[0][1]])
      .addTo(map);

    fitButton.textContent = labels.fit;
    range.setAttribute("aria-label", labels.progress);
    renderSpeeds();
    updatePlayButton();
    panel.classList.add("visible");
    document.documentElement.style.setProperty("--panel-h", panel.offsetHeight + "px");
    updateProgressUi();

    map.fitBounds(lngLatBounds(), { padding: panelPadding(), pitch: 0, bearing: 0, duration: 0 });
    fitTimer = setTimeout(function () {
      map.easeTo({ pitch: 55, duration: 2000 });
    }, 1500);
  };

  var handleRawMessage = function (event) {
    var data = event && event.data;

    if (typeof data !== "string") {
      return;
    }

    var message;

    try {
      message = JSON.parse(data);
    } catch (error) {
      return;
    }

    if (message && message.type === "load") {
      try {
        applyLoad(message);
      } catch (error) {
        fail("load:" + (error && error.message ? error.message : "unknown"));
      }
    }
  };

  // Android는 document, iOS는 window로 온다.
  document.addEventListener("message", handleRawMessage);
  window.addEventListener("message", handleRawMessage);

  // ── 컨트롤 ──
  playButton.addEventListener("click", handlePressPlay);
  fitButton.addEventListener("click", function () {
    if (loaded) {
      fitAll(true);
    }
  });
  range.addEventListener("pointerdown", function () { scrubbing = true; });
  range.addEventListener("touchstart", function () { scrubbing = true; }, { passive: true });

  var endScrub = function () { scrubbing = false; };

  range.addEventListener("pointerup", endScrub);
  range.addEventListener("touchend", endScrub);
  range.addEventListener("change", endScrub);
  range.addEventListener("input", function () {
    if (!loaded) {
      return;
    }

    progress = Math.max(0, Math.min(1, Number(range.value) / RANGE_MAX));
    updateProgressUi();

    if (playing && following && performance.now() >= easingUntil) {
      map.jumpTo(followCamera(progress * totalDistance));
    }
  });

  // ── 지도 ──
  try {
    map = new maplibregl.Map({
      container: "map",
      style: STYLE_URL,
      center: [127.9, 36.2],
      zoom: 6,
      pitch: 0,
      maxPitch: 75,
      attributionControl: { compact: true }
    });
  } catch (error) {
    fail("map:" + (error && error.message ? error.message : "unknown"));

    return;
  }

  // 손으로 지도를 움직이면 따라가기만 푼다 — 재생은 계속한다(RR-2, BD-11 방향 모드와 같은 규칙).
  ["dragstart", "zoomstart", "rotatestart", "pitchstart"].forEach(function (name) {
    map.on(name, function (event) {
      if (event && event.originalEvent && following) {
        following = false;
        easingUntil = 0;
        updatePlayButton();
      }
    });
  });

  var styleLoaded = false;

  var getErrorText = function (event) {
    var error = (event && event.error) || {};

    return String(error.message || "unknown") + (error.url ? " " + error.url : "");
  };

  // 준비 전 오류 중 **스타일 JSON**을 못 받은 것만 실패다(RR-3). 타일·소스(sourceId)·스프라이트·글리프
  // 오류는 지도가 그 조각만 빼고 그리므로 로그만 남긴다.
  var isFatalStyleError = function (event) {
    if (!event || event.sourceId || event.tile || event.source) {
      return false;
    }

    var error = event.error || {};
    var url = typeof error.url === "string" ? error.url : "";

    if (/sprite|glyph|fonts?\/|\.pbf/i.test(url + " " + String(error.message || ""))) {
      return false;
    }

    if (url) {
      return url.split("?")[0] === STYLE_URL;
    }

    // 주소 없는 오류(스타일 파싱 실패 등)는 스타일을 다 읽기 전일 때만 스타일 실패로 본다.
    return !styleLoaded;
  };

  map.on("error", function (event) {
    if (ready || !isFatalStyleError(event)) {
      console.warn("[RouteReplay] map error " + getErrorText(event));

      return;
    }

    fail("style:" + getErrorText(event));
  });

  // 접힌 ⓘ로 시작한다 — 펼친 출처 줄이 지도 아래쪽을 가린다(누르면 펼쳐진다).
  var collapseAttribution = function () {
    Array.prototype.forEach.call(document.querySelectorAll(".maplibregl-ctrl-attrib"), function (element) {
      element.classList.remove("maplibregl-compact-show");
      element.removeAttribute("open");
    });
  };

  // ready는 스타일을 다 읽은 시점(style.load)에 보낸다 — 타일 전부를 기다리는 load는 산악 지형에서
  // 15초 상한을 넘기기 쉽다. 지형·하늘은 스타일의 소스가 생긴 뒤라 여기서 켜도 된다.
  map.on("style.load", function () {
    if (styleLoaded) {
      return;
    }

    styleLoaded = true;

    try {
      map.setTerrain({ source: "terrain", exaggeration: EXAGGERATION });
    } catch (error) {
      // 지형이 없어도 평면으로는 보인다.
    }

    try {
      map.setSky({
        "sky-color": "#A9CBEF",
        "horizon-color": "#E6EFF8",
        "fog-color": "#FFFFFF",
        "sky-horizon-blend": 0.6,
        "horizon-fog-blend": 0.6,
        "fog-ground-blend": 0.7,
        "atmosphere-blend": 0
      });
    } catch (error) {
      // 하늘 스펙이 없는 버전이면 생략한다.
    }

    collapseAttribution();

    if (errored) {
      return;
    }

    ready = true;
    post({ type: "ready" });
  });

  // 출처 표기는 첫 렌더 뒤에 펼쳐질 수 있어 load에서 한 번 더 접는다.
  map.on("load", collapseAttribution);
})();
</script>
</body>
</html>
`;
