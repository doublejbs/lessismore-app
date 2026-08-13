import { FC, useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import app from '@/model/app/App';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgRow,
  AcgType,
} from '@/constants/DesignTokens';
import SpotPinView from '@/components/camp-site/SpotPinView';
import {
  BAG_CARD_MAP_LEVEL,
  buildStaticMapUrl,
  STATIC_MAP_REFERER,
} from '@/model/map/StaticMapUrl';

/**
 * 지도 밴드 높이(BAG-1). 카드 폭 전체를 쓰는 가로로 긴 띠다 — 정사각 썸네일로 만들면 카드
 * 절반이 지도가 되어 목록에서 이름·무게를 훑는 일이 밀린다.
 */
const MAP_BAND_HEIGHT = 110;

// 카드 사이 간격(BAG-1). 스와이프 래퍼가 사라졌으니 카드 자신이 갖는다.
const CARD_GAP = 12;

// 카드 본문 좌우 패딩. 홈 일정 카드(HM-1)와 같은 값이라 두 화면의 카드가 같은 리듬을 갖는다.
const CARD_PADDING_HORIZONTAL = 16;

// `⋯` 버튼 폭. 세로는 본문 높이만큼 늘어나므로(stretch) 44×44 터치 타깃을 넘긴다.
const MENU_BUTTON_WIDTH = 44;

/**
 * 아이콘(16)이 44 폭 안에 중앙 정렬되면 시각 여백이 (44−16)/2 = 14 생긴다. 카드 좌우 패딩 16과
 * 광학적으로 맞추기 위해 남는 2만 오른쪽 마진으로 준다 — 죽는 터치 영역이 2pt뿐이다.
 */
const MENU_BUTTON_MARGIN_RIGHT = 2;

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
 *
 * 복사·삭제는 우측 `⋯` 메뉴다(BAG-3/BAG-4, 2026-08-13). 예전에는 트레일링 스와이프 액션이었다.
 * **셰브론도 함께 걷었다**: HM-8의 셰브론 규칙은 헤어라인 행의 것이고, 카드는 카드 전체가 탭
 * 대상이라(홈 일정 카드도 셰브론이 없다) 우측에 셰브론과 메뉴를 나란히 두면 오탭만 늘어난다.
 */
const BagItemView: FC<Props> = ({ bagItem, bag }) => {
  const date = bagItem.getDate();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [showMenu, setShowMenu] = useState(false);
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
      // 마커는 이미지에 싣지 않는다 — NCP 기본 핀은 앱 마커와 다르고 커스텀 아이콘
      // 파라미터는 렌더되지 않는다(2026-08-13 실측). 앱 핀(SpotPinView)을 위에 얹는다.
      withMarker: false,
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

  const handleClickMenu = () => {
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
  };

  // 시트를 먼저 닫고 확인 다이얼로그(Bag.delete)를 띄운다 — 시트 위에 겹치지 않는다(BAG-3).
  const handleClickDelete = () => {
    setShowMenu(false);
    bag.delete(bagItem);
  };

  const handleClickSaveTemplate = () => {
    setShowMenu(false);

    if (!app.getFirebase()?.isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    router.push({
      pathname: '/bag-template-save',
      params: {
        sourceId: bagItem.getID(),
        sourceName: bagItem.getName(),
      },
    });
  };

  const handleClickCopy = () => {
    setShowMenu(false);

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

  const menuItems = [
    {
      icon: 'copy-outline' as const,
      text: '복사',
      onPress: handleClickCopy,
    },
    {
      icon: 'bookmark-outline' as const,
      text: '템플릿으로 저장',
      onPress: handleClickSaveTemplate,
    },
    {
      icon: 'trash-outline' as const,
      text: '삭제',
      onPress: handleClickDelete,
    },
  ];

  /**
   * 카드 본문은 VoiceOver에서 **하나의 요소**로 읽힌다. 지도 밴드는 `accessible={false}`로 빼고
   * 여행지명을 이 라벨에 실어, 밴드가 전하는 "어디"가 사라지지 않게 한다(BAG-1 접근성).
   */
  const locationName = bagItem.getLocationName();
  const cardAccessibilityLabel = `${bagItem.getName()}, ${date}, ${bagItem.getWeight()}kg${
    locationName ? `, ${locationName}` : ''
  }`;

  return (
    <>
      <View style={styles.card}>
        {/*
          지도 밴드(BAG-1). 이미지 위에 글자·그라디언트를 얹지 않는다 — 응답 이미지에 박힌
          네이버 로고·저작권 고지를 가리는 것이 NCP 약관 위반이다. 서버에 저장하지 않고
          `expo-image`의 기기 캐시만 쓴다. 탭은 본문과 같이 상세로 가고, 접근성 트리에서는
          빠진다(여행지명은 본문 라벨에 실려 있다).
        */}
        {showMapBand ? (
          <TouchableOpacity
            style={styles.mapBand}
            onPress={handleClick}
            activeOpacity={0.7}
            accessible={false}
          >
            <Image
              // Referer가 없으면 401(NCP 등록 도메인 검사) — StaticMapUrl.ts 참고.
              source={{ uri: mapUrl, headers: { Referer: STATIC_MAP_REFERER } }}
              style={StyleSheet.absoluteFill}
              contentFit='cover'
              cachePolicy='memory-disk'
              transition={160}
              onError={handleMapError}
              accessible={false}
            />
            {/* 앱 공통 박지 핀 — 끝점이 여행지 좌표(이미지 중심)에 닿게 앵커한다. */}
            <View style={styles.pinOverlay} pointerEvents='none'>
              <SpotPinView />
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.body}>
          {/*
            상세 이동 영역. 메뉴 버튼을 이 안에 **중첩하지 않는다** — 카드 본문이 라벨을 가진
            하나의 접근성 요소라, 중첩하면 VoiceOver가 메뉴 버튼에 닿지 못한다(BAG-1 접근성).
            좌우·위아래 패딩을 이 터치 영역이 삼켜 카드 안쪽에 죽는 영역이 남지 않는다.
          */}
          <TouchableOpacity
            style={styles.bodyText}
            onPress={handleClick}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={cardAccessibilityLabel}
          >
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
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleClickMenu}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel='배낭 메뉴'
          >
            <Ionicons
              name='ellipsis-horizontal'
              size={16}
              color={Acg.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      <BottomMenuModalView
        visible={showMenu}
        onClose={handleCloseMenu}
        menuItems={menuItems}
      />
    </>
  );
};

const styles = StyleSheet.create({
  /**
   * 배낭 카드(BAG-1, 2026-08-13). 홈 일정 카드와 같은 연회색 면 + 모서리 12 + 그림자 없음.
   *
   * `overflow: hidden`이 지도 밴드의 상단 모서리를 카드 모서리로 깎고, 밴드가 카드 밖으로
   * 새지 않게 한다.
   */
  card: {
    width: '100%',
    marginBottom: CARD_GAP,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    overflow: 'hidden',
  },
  // 폭은 카드를 꽉 채운다 — 요청 w/h와 같은 비율이라 `cover`로도 크롭이 생기지 않는다.
  mapBand: {
    width: '100%',
    height: MAP_BAND_HEIGHT,
  },
  // 핀 폭 30·높이 40 — 끝점(하단 중앙)이 밴드 중심에 오도록 절반 폭/전체 높이만큼 당긴다.
  pinOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -15,
    marginTop: -40,
  },
  /**
   * 본문 치수는 목록 공통 토큰(AcgRow)을 그대로 쓴다 — 밴드가 없는 카드도 44pt를 넘긴다.
   * 패딩은 행이 아니라 **자식 터치 영역**이 갖는다(위 주석 참고).
   */
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: AcgRow.minHeight,
  },
  bodyText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: AcgRow.paddingVertical,
    paddingLeft: CARD_PADDING_HORIZONTAL,
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
   * `⋯` 메뉴 버튼(BAG-1). `stretch`로 본문 높이를 꽉 채워, 이름이 두 줄인 카드에서도 아이콘이
   * 세로 중앙에 오고 이 열에 죽는 영역이 없다. 폭 44 + 세로 최소 72로 44×44를 넘긴다.
   */
  menuButton: {
    width: MENU_BUTTON_WIDTH,
    marginRight: MENU_BUTTON_MARGIN_RIGHT,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BagItemView;
