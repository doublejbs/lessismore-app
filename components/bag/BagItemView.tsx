import { FC, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import app from '@/model/app/App';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Ionicons } from '@expo/vector-icons';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgRow,
  AcgType,
} from '@/constants/DesignTokens';
import {
  BAG_CARD_MAP_LEVEL,
  buildStaticMapUrl,
  STATIC_MAP_REFERER,
} from '@/model/map/StaticMapUrl';

// 삭제 스와이프 액션 배경 — 파괴적 액션 시맨틱 색(DesignTokens 예외, CLAUDE.md 참고).
const DELETE_RED = '#FF3B30';

// 액션 버튼 1개 너비. 전체 액션 영역 = ACTION_WIDTH * 2.
const ACTION_WIDTH = 72;
const ACTIONS_TOTAL_WIDTH = ACTION_WIDTH * 2;

/**
 * 지도 밴드 높이(BAG-1). 카드 폭 전체를 쓰는 가로로 긴 띠다 — 정사각 썸네일로 만들면 카드
 * 절반이 지도가 되어 목록에서 이름·무게를 훑는 일이 밀린다.
 */
const MAP_BAND_HEIGHT = 110;

// 카드 사이 간격(BAG-1). 카드 자체가 아니라 스와이프 래퍼 바깥에 둔다 — 아래 주석 참고.
const CARD_GAP = 12;

// 카드 본문 좌우 패딩. 홈 일정 카드(HM-1)와 같은 값이라 두 화면의 카드가 같은 리듬을 갖는다.
const CARD_PADDING_HORIZONTAL = 16;

interface RightActionsProps {
  // ReanimatedSwipeable가 넘겨주는 드래그 변위(열릴수록 음수, 닫히면 0).
  drag: SharedValue<number>;
  onCopy: () => void;
  onDelete: () => void;
}

// 드래그 변위에 맞춰 오른쪽에서 슬라이드 인. 닫힘(drag=0) 상태에선 화면 밖으로 밀려 숨겨져
// 살짝 드래그했을 때 액션이 통째로 깜빡이는 문제를 방지한다.
const RightActions: FC<RightActionsProps> = ({ drag, onCopy, onDelete }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + ACTIONS_TOTAL_WIDTH }],
  }));

  return (
    <Reanimated.View style={[styles.actionsContainer, animatedStyle]}>
      <TouchableOpacity
        style={[styles.actionButton, styles.copyAction]}
        onPress={onCopy}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel='배낭 복사'
      >
        <IconSymbol name='doc.on.doc' size={20} color={Acg.paper} />
        <PretendardText style={styles.actionLabel} weight='medium'>
          복사
        </PretendardText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteAction]}
        onPress={onDelete}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel='배낭 삭제'
      >
        <IconSymbol name='trash.fill' size={20} color={Acg.paper} />
        <PretendardText style={styles.actionLabel} weight='medium'>
          삭제
        </PretendardText>
      </TouchableOpacity>
    </Reanimated.View>
  );
};

interface Props {
  bagItem: BagItem;
  bag: Bag;
}

/**
 * 배낭 목록 항목(BAG-1) — **카드 문법**(2026-08-13 사용자 결정).
 *
 * 홈 일정 카드(HM-1)와 같은 연회색 면 + 모서리 12 + 그림자 없음이다. 여행지가 있으면 카드
 * 상단에 지도 이미지 밴드를 얹는다: 이 화면에서 배낭을 알아보는 가장 빠른 단서가 "어디로 가는
 * 여행이냐"이고, 그건 텍스트 한 줄로 대신할 수 없다.
 *
 * **[Home.md](../../specs/Home.md) HM-8 행 문법의 화면별 예외다** — 창고·홈 목록·복사 원본
 * 선택 시트는 계속 헤어라인 행이다. 배낭만 카드인 이유는 항목이 "한 줄로 훑는 값"이 아니라
 * 여행 한 건이고, 이미지를 담으려면 담을 면이 필요하기 때문이다.
 */
const BagItemView: FC<Props> = ({ bagItem, bag }) => {
  const date = bagItem.getDate();
  const router = useRouter();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const { width: windowWidth } = useWindowDimensions();
  /**
   * 로드에 실패한 URL. 실패 플래그를 boolean으로 두면 URL이 바뀌어도(화면 회전 → 폭 변경)
   * 실패 상태가 남는다 — URL을 담아 두면 새 URL에서 자연히 한 번 더 시도한다.
   */
  const [failedMapUrl, setFailedMapUrl] = useState<string | null>(null);

  const location = bagItem.getLocation();
  // 카드 폭 = 화면 폭 − 좌우 화면 패딩. 요청 w/h를 표시 박스와 같은 비율로 잡아야 응답
  // 이미지의 네이버 로고·저작권 고지가 크롭되지 않는다(BAG-1 저작권 제약).
  const cardWidth = windowWidth - AcgLayout.screenPadding * 2;
  const mapUrl = useMemo(() => {
    if (!location) {
      return null;
    }

    return buildStaticMapUrl({
      latitude: location.latitude,
      longitude: location.longitude,
      widthPx: cardWidth,
      heightPx: MAP_BAND_HEIGHT,
      level: BAG_CARD_MAP_LEVEL,
    });
  }, [location, cardWidth]);

  /**
   * 밴드를 그릴지. URL을 못 만든 경우(키 미설정·좌표 이상)와 로드 실패를 **같은 폴백**으로
   * 수렴시킨다 — 빈 회색 밴드나 깨진 이미지 아이콘을 남기지 않는다(BAG-1).
   */
  const showMapBand = mapUrl !== null && mapUrl !== failedMapUrl;

  const handleClick = () => {
    app.getAnalyticsManager()?.logClick('bag_item');
    router.push(`/bag/${bagItem.getID()}`);
  };

  const handleMapError = () => {
    setFailedMapUrl(mapUrl);
  };

  const handleClickDelete = () => {
    swipeableRef.current?.close();
    bag.delete(bagItem);
  };

  const handleClickCopy = () => {
    swipeableRef.current?.close();

    if (!app.getFirebase()?.isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    router.push({
      pathname: '/bag-copy',
      params: {
        sourceId: bagItem.getID(),
        sourceName: bagItem.getName(),
        entrySource: 'list',
      },
    });
  };

  const renderRightActions = (
    _progress: SharedValue<number>,
    drag: SharedValue<number>
  ) => (
    <RightActions
      drag={drag}
      onCopy={handleClickCopy}
      onDelete={handleClickDelete}
    />
  );

  /**
   * 카드는 VoiceOver에서 **하나의 요소**로 읽힌다. 지도 밴드는 `accessible={false}`로 빼고
   * 여행지명을 이 라벨에 실어, 밴드가 전하는 "어디"가 사라지지 않게 한다(BAG-1 접근성).
   */
  const locationName = bagItem.getLocationName();
  const cardAccessibilityLabel = `${bagItem.getName()}, ${date}, ${bagItem.getWeight()}kg${
    locationName ? `, ${locationName}` : ''
  }`;

  return (
    /**
     * 간격을 **스와이프 래퍼 바깥**에서 준다. 카드에 `marginBottom`을 주면 액션 패널이
     * `alignItems: 'stretch'`로 그 여백까지 늘어나 카드 아래로 빨간 띠가 삐져나온다(BAG-4).
     */
    <View style={styles.spacing}>
      <ReanimatedSwipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={renderRightActions}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={handleClick}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={cardAccessibilityLabel}
        >
          {/*
            지도 밴드(BAG-1). 이미지 위에 글자·그라디언트를 얹지 않는다 — 응답 이미지에 박힌
            네이버 로고·저작권 고지를 가리는 것이 NCP 약관 위반이다. 서버에 저장하지 않고
            `expo-image`의 기기 캐시만 쓴다.
          */}
          {showMapBand ? (
            <Image
              // Referer가 없으면 401(NCP 등록 도메인 검사) — StaticMapUrl.ts 참고.
              source={{ uri: mapUrl, headers: { Referer: STATIC_MAP_REFERER } }}
              style={styles.mapBand}
              contentFit='cover'
              cachePolicy='memory-disk'
              transition={160}
              onError={handleMapError}
              accessible={false}
            />
          ) : null}

          <View style={styles.body}>
            <View style={styles.bodyText}>
              <PretendardText
                weight='medium'
                style={styles.name}
                numberOfLines={2}
              >
                {bagItem.getName()}
              </PretendardText>

              {/*
                값을 한 줄에 `·`로 묶는다 — 무게 · 기간 · 패킹. 무게가 맨 앞이라 카드마다 같은
                자리에서 비교되고, 숫자만 중첩 Text로 콘덴스드다. 패킹은 칩이 아니라 이 줄의
                마지막 조각이다: 카드가 이미 면이라 그 안의 칩은 면 위의 면이 된다.
              */}
              <PretendardText style={styles.meta} numberOfLines={1}>
                <AcgDisplayText style={styles.metaNumber}>
                  {`${bagItem.getWeight()}kg`}
                </AcgDisplayText>
                {` · ${date}`}
                {bagItem.hasPackingRecord()
                  ? bagItem.isPackingComplete()
                    ? ' · 패킹 완료'
                    : ` · 패킹 ${bagItem.getPackingPercent()}%`
                  : ''}
              </PretendardText>
            </View>

            <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
          </View>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    </View>
  );
};

const styles = StyleSheet.create({
  spacing: {
    marginBottom: CARD_GAP,
  },
  /**
   * 배낭 카드(BAG-1, 2026-08-13). 홈 일정 카드와 같은 연회색 면 + 모서리 12 + 그림자 없음.
   *
   * `overflow: hidden`이 두 일을 한다: 지도 밴드의 상단 모서리를 카드 모서리로 깎고, 밴드가
   * 카드 밖으로 새지 않게 한다. 면이 불투명이라 뒤의 스와이프 액션색도 비치지 않는다.
   */
  card: {
    width: '100%',
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    overflow: 'hidden',
  },
  // 폭은 카드를 꽉 채운다 — 요청 w/h와 같은 비율이라 `cover`로도 크롭이 생기지 않는다.
  mapBand: {
    width: '100%',
    height: MAP_BAND_HEIGHT,
  },
  // 본문 치수는 목록 공통 토큰(AcgRow)을 그대로 쓴다 — 밴드가 없는 카드도 44pt를 넘긴다.
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
  },
  bodyText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  // 메타는 회색이 아니라 잉크다(레퍼런스) — 무게·기간·패킹은 장식이 아니라 정보다.
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  // 메타 줄 안의 숫자 조각 — 크기는 상속하고 서체만 콘덴스드로 바꾼다.
  metaNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  /**
   * 액션 패널은 카드 높이를 따라간다(`stretch`) — 밴드가 있는 카드와 없는 카드가 섞여도 각자
   * 자기 카드에 맞는다. **오른쪽 모서리만** 카드와 같이 깎아 열렸을 때 실루엣이 이어진다.
   */
  actionsContainer: {
    width: ACTIONS_TOTAL_WIDTH,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopRightRadius: AcgRadius.thumb,
    borderBottomRightRadius: AcgRadius.thumb,
    overflow: 'hidden',
  },
  actionButton: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  copyAction: {
    backgroundColor: Acg.ink,
  },
  deleteAction: {
    backgroundColor: DELETE_RED,
  },
  actionLabel: {
    ...AcgType.meta,
    color: Acg.paper,
  },
});

export default BagItemView;
