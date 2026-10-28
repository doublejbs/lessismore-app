import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { reaction } from 'mobx';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import MapLayerControlView from '@/components/map/MapLayerControlView';
import LoadingView from '@/components/ui/LoadingView';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import MapLayer from '@/model/map/MapLayer';
import MapLayerScreen from '@/model/map/MapLayerScreen';
import {
  buildRouteReplayLoadMessage,
  buildRouteReplaySatellitePayload,
} from '@/model/route-replay/RouteReplayCoordinates';
import RouteReplayFailReason from '@/model/route-replay/RouteReplayFailReason';
import {
  ROUTE_REPLAY_BASE_URL,
  ROUTE_REPLAY_HTML,
} from '@/model/route-replay/RouteReplayHtml';
import {
  RouteReplayLayerMessage,
  RouteReplayLoadMessage,
  RouteReplaySatellitePayload,
  parseRouteReplayWebMessage,
} from '@/model/route-replay/RouteReplayMessage';
import RouteReplayMessageType from '@/model/route-replay/RouteReplayMessageType';
import { RouteReplayRequest } from '@/model/route-replay/RouteReplayRequest';
import RouteReplayStatus from '@/model/route-replay/RouteReplayStatus';
import RouteReplayNoticeView from './RouteReplayNoticeView';

interface Props {
  request: RouteReplayRequest;
}

/** 웹 문서가 `ready`를 보내야 하는 상한(RR-3). 지형 타일이 늦는 것은 실패가 아니다. */
const READY_TIMEOUT_MS = 15000;

/** 배속 칩(RR-2). */
const SPEED_OPTIONS = [1, 2, 4];

/** 지도 종류 버튼 자리 — 헤더(세이프에어리어) 아래·우측 16(RR-2, 다른 지도 화면과 같은 규칙). */
const MAP_CONTROL_INSET = 16;

/** 웹뷰 안에서 열어도 되는 주소의 머리 — 최초 문서(`about:blank`·`baseUrl` 자신)와 같은 호스트. */
const IN_WEBVIEW_URL_PREFIXES = ['about:', `${ROUTE_REPLAY_BASE_URL}/`];

const isInWebViewUrl = (url: string): boolean =>
  url === ROUTE_REPLAY_BASE_URL ||
  IN_WEBVIEW_URL_PREFIXES.some(prefix => url.startsWith(prefix));

/**
 * 지금 지도 종류의 위성 값(RR-2 · MAP-7) — 위성이 아니면 `null`.
 * 게이트·오프라인·한도 폴백은 `getLayer()`가 이미 가른다.
 */
const isSatelliteLayer = (): boolean =>
  app.getMapLayerStore()?.getLayer() === MapLayer.Satellite;

const getSatellitePayload = (
  isSatellite: boolean
): RouteReplaySatellitePayload | null =>
  isSatellite ? buildRouteReplaySatellitePayload() : null;

/**
 * 웹뷰가 문서를 떠나지 않게 한다 — 출처 표기(OpenFreeMap·OSM 등) 링크는 시스템 브라우저로 연다.
 * 하위 프레임(iOS `isTopFrame === false`) 로드는 막지 않는다.
 */
const handleShouldStartLoad = (request: ShouldStartLoadRequest): boolean => {
  if (request.isTopFrame === false || isInWebViewUrl(request.url)) {
    return true;
  }

  if (/^https?:/i.test(request.url)) {
    Linking.openURL(request.url).catch(error => {
      console.warn('[RouteReplay] 외부 링크 열기 실패', error); // l10n-ignore: 개발자 로그
    });
  }

  return false;
};

/**
 * 3D 리플레이 웹뷰(RR-2 · RR-3). MapLibre GL JS 문서를 띄우고, 준비되면 코스를 한 번 넘긴다.
 * 실패하면 빈 상태 + `다시 시도`(웹뷰를 새로 마운트)로 바꾼다.
 */
const RouteReplayWebView: FC<Props> = ({ request }) => {
  const l10n = app.getL10n();
  const webViewRef = useRef<WebView>(null);
  // 시도마다 올라간다 — 웹뷰 `key`라 다시 시도하면 문서를 처음부터 다시 띄운다.
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(RouteReplayStatus.Loading);
  // 이 시도를 시작한 시각(`route_replay_ready.load_ms`). 이펙트가 시도마다 다시 적는다.
  const startedAtRef = useRef(0);
  // 한 시도에서 실패·준비를 한 번만 처리한다(타임아웃과 늦은 `ready`가 겹칠 수 있다).
  const settledRef = useRef(false);
  // 이 시도에서 `load`를 보냈는지 — 그 뒤에만 지도 종류 전환을 `layer`로 보낸다.
  const loadedRef = useRef(false);
  // 위성 값은 비워 둔다 — `load`를 보내는 순간의 지도 종류로 채운다(준비 전에 바꿔도 그 값이 간다).
  const baseLoadMessage = useMemo<RouteReplayLoadMessage>(
    () =>
      buildRouteReplayLoadMessage(
        request,
        {
          start: l10n.t('routeReplay.start'),
          end: l10n.t('routeReplay.end'),
          play: l10n.t('routeReplay.play'),
          pause: l10n.t('routeReplay.pause'),
          fit: l10n.t('routeReplay.fit'),
          speedHint: l10n.t('routeReplay.speedHint'),
          progress: l10n.t('routeReplay.progress'),
          speeds: SPEED_OPTIONS.map(value => ({
            value,
            label: l10n.t('routeReplay.speed', { speed: value }),
          })),
        },
        null
      ),
    [l10n, request]
  );

  const fail = useCallback((reason: RouteReplayFailReason, detail = '') => {
    if (settledRef.current) {
      return;
    }

    settledRef.current = true;
    setStatus(RouteReplayStatus.Failed);
    app.getAnalyticsManager()?.logEvent('route_replay_failed', { reason });

    if (detail) {
      console.warn('[RouteReplay] 실패', reason, detail); // l10n-ignore: 개발자 로그
    }
  }, []);

  useEffect(() => {
    startedAtRef.current = Date.now();
    settledRef.current = false;
    loadedRef.current = false;

    const timeoutId = setTimeout(() => {
      fail(RouteReplayFailReason.Timeout);
    }, READY_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [attempt, fail]);

  // 보는 중 지도 종류가 바뀌면(RR-2) 문서를 다시 띄우지 않고 위성만 넣고 뺀다 — 재생·카메라는 그대로다.
  useEffect(() => {
    return reaction(isSatelliteLayer, isSatellite => {
      if (!loadedRef.current) {
        return;
      }

      const message: RouteReplayLayerMessage = {
        type: RouteReplayMessageType.Layer,
        satellite: getSatellitePayload(isSatellite),
      };

      webViewRef.current?.postMessage(JSON.stringify(message));
    });
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseRouteReplayWebMessage(event.nativeEvent.data);

      if (!message) {
        return;
      }

      switch (message.type) {
        case RouteReplayMessageType.Ready: {
          if (settledRef.current) {
            return;
          }

          settledRef.current = true;
          setStatus(RouteReplayStatus.Ready);
          app.getAnalyticsManager()?.logEvent('route_replay_ready', {
            load_ms: Date.now() - startedAtRef.current,
          });
          webViewRef.current?.postMessage(
            JSON.stringify({
              ...baseLoadMessage,
              satellite: getSatellitePayload(isSatelliteLayer()),
            })
          );
          loadedRef.current = true;

          return;
        }
        case RouteReplayMessageType.Error: {
          // 준비 뒤의 오류(좌표 이상 등)도 화면을 실패로 돌린다 — 그릴 것이 없다.
          settledRef.current = false;
          fail(RouteReplayFailReason.WebError, message.message);

          return;
        }
        case RouteReplayMessageType.Play: {
          app
            .getAnalyticsManager()
            ?.logEvent('route_replay_play', { speed: message.speed });

          return;
        }
        case RouteReplayMessageType.Finished: {
          app.getAnalyticsManager()?.logEvent('route_replay_finished');

          return;
        }
      }
    },
    [baseLoadMessage, fail]
  );

  const handleError = useCallback(() => {
    fail(RouteReplayFailReason.WebError);
  }, [fail]);

  const handleHttpError = useCallback(() => {
    fail(RouteReplayFailReason.HttpError);
  }, [fail]);

  const handleRetry = useCallback(() => {
    setStatus(RouteReplayStatus.Loading);
    setAttempt(previous => previous + 1);
  }, []);

  if (status === RouteReplayStatus.Failed) {
    return (
      <RouteReplayNoticeView
        message={l10n.t('routeReplay.failed')}
        actionLabel={l10n.t('common.retry')}
        onPressAction={handleRetry}
      />
    );
  }

  return (
    <View style={styles.root}>
      <WebView
        key={attempt}
        ref={webViewRef}
        style={styles.webView}
        source={{ html: ROUTE_REPLAY_HTML, baseUrl: ROUTE_REPLAY_BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        // 지도 제스처를 문서가 받는다 — 웹뷰 자체가 튕기거나 확대되지 않게 한다.
        bounces={false}
        scrollEnabled={false}
        overScrollMode='never'
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onMessage={handleMessage}
        onError={handleError}
        onHttpError={handleHttpError}
      />
      {/* 웹뷰는 뒤에서 뜬다 — 흰 깜빡임 대신 로딩을 겹친다(RR-3). */}
      {status === RouteReplayStatus.Loading ? (
        <View style={styles.loading} pointerEvents='none'>
          <LoadingView />
        </View>
      ) : null}
      {/* 지도 종류(RR-2 · MAP-7) — 우측 위. 아래 패널·출처 표기(우측 아래)와 겹치지 않는다. */}
      {status === RouteReplayStatus.Ready ? (
        <View style={styles.mapControl} pointerEvents='box-none'>
          <MapLayerControlView screen={MapLayerScreen.RouteReplay} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  webView: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Acg.paper,
  },
  mapControl: {
    position: 'absolute',
    top: MAP_CONTROL_INSET,
    right: MAP_CONTROL_INSET,
  },
});

export default RouteReplayWebView;
