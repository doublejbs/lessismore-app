import { FC, useCallback, useRef } from 'react';
import {
  PixelRatio,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import FilmCardElement from '@/model/bag-film-card/FilmCardElement';
import FilmCardRatio from '@/model/bag-film-card/FilmCardRatio';
import BagFilmCardCanvasView, {
  FilmCardCanvasElement,
} from '@/components/bag-film-card/BagFilmCardCanvasView';
import BagFilmCardOverlayView, {
  FilmCardChipOption,
} from '@/components/bag-film-card/BagFilmCardOverlayView';
import FilmCardCorner from '@/components/bag-film-card/FilmCardCorner';
import useElementTransform, {
  ElementTransform,
} from '@/components/bag-film-card/useElementTransform';

interface Props {
  filmCard: BagFilmCard;
}

// 캡처 해상도 환산에만 쓴다(getCaptureSize 주석 참고). 화면 구성에는 플랫폼 분기가 없다 —
// iOS 네이티브 헤더도, Android/Web 커스텀 헤더도 쓰지 않고 플로팅 뒤로가기로 통일했다(BS-10).
const IS_IOS = Platform.OS === 'ios';

// SNS 업로드에 충분한 가로 해상도(BS-5).
const CAPTURE_PIXEL_WIDTH = 1080;

const MIN_CANVAS_WIDTH = 200;

/**
 * 화면 배경(BS-10). 검정이라 프리뷰 경계가 배경색만으로 드러나고, 캔버스 비율이 화면비와
 * 다른 만큼 남는 위아래 여백이 레터박스처럼 읽힌다.
 *
 * 디자인 토큰(`Color.background` = 흰색)을 쓰지 않는 이유는 여기가 앱 화면이 아니라
 * **프리뷰를 위한 암전 배경**이기 때문이다 — 떠 있는 컨트롤 색도 같은 이유로
 * `FilmCardControlPalette`를 따로 둔다.
 */
const SCREEN_BACKGROUND = '#000000';

/**
 * 비율별 캔버스 규격(BS-7).
 *
 * 캔버스는 언제나 사진이라 비율이 **항상 고정**이다 — 내용이 높이를 정하던 옛 `카드`
 * 비율이 사라지면서 실측 되먹임(onLayout → 비율 갱신)도 함께 없앴다.
 * `aspect`는 캔버스 높이/너비다.
 */
const CANVAS_SPECS: Record<
  FilmCardRatio,
  { label: string; accessibilityLabel: string; aspect: number }
> = {
  [FilmCardRatio.Feed]: {
    label: '4:5',
    accessibilityLabel: '4 대 5 비율',
    aspect: 5 / 4,
  },
  [FilmCardRatio.Story]: {
    label: '9:16',
    accessibilityLabel: '9 대 16 비율',
    aspect: 16 / 9,
  },
};

const RATIO_OPTIONS: readonly FilmCardRatio[] = [
  FilmCardRatio.Feed,
  FilmCardRatio.Story,
];

const ELEMENT_SPECS: Record<
  FilmCardElement,
  { label: string; accessibilityLabel: string }
> = {
  [FilmCardElement.Polaroid]: {
    label: '폴라로이드',
    accessibilityLabel: '폴라로이드 요소',
  },
  [FilmCardElement.PackingList]: {
    label: '패킹리스트',
    accessibilityLabel: '패킹리스트 요소',
  },
};

const ELEMENT_OPTIONS: readonly FilmCardElement[] = [
  FilmCardElement.Polaroid,
  FilmCardElement.PackingList,
];

/**
 * 폴라로이드 기본 폭(캔버스 폭 대비, BS-3). 사용자가 핀치로 조절하는 **기본 크기**다.
 * 사방에 사진이 충분히 남아 "그 순간을 인화해 그 자리에 놓은" 그림이 된다.
 */
const POLAROID_WIDTH_FRACTION = 0.56;

/**
 * 패킹리스트 기본 폭(캔버스 폭 대비, BS-8)과 본문에 싣는 장비 수.
 *
 * 종이를 이보다 좁히지 않는다: 40%까지 줄이면 브랜드 줄이 1080px 캡처 기준 약 11px이 되어
 * 피드에서 읽히지 않는다. 장비가 넘치면 종이를 줄이는 대신 목록을 자른다(`+N MORE`).
 */
const PACKING_LIST_WIDTH_FRACTION: Record<FilmCardRatio, number> = {
  [FilmCardRatio.Feed]: 0.44,
  [FilmCardRatio.Story]: 0.48,
};

const PACKING_LIST_ITEM_LIMIT: Record<FilmCardRatio, number> = {
  [FilmCardRatio.Feed]: 8,
  [FilmCardRatio.Story]: 14,
};

/**
 * iOS 네이티브는 캡처 옵션 크기를 pt로 받아 기기 배율만큼 픽셀이 곱해지고(RNViewShot.mm의
 * `UIGraphicsImageRendererFormat.scale = 0`), Android는 px로 받아 그대로 리사이즈한다
 * (ViewShot.java의 `Bitmap.createScaledBitmap`). 결과가 양쪽 모두 정확히 가로 1080px이
 * 되도록 플랫폼별로 환산한다.
 */
const getCaptureSize = (ratio: number) => {
  const width = IS_IOS
    ? Math.round(CAPTURE_PIXEL_WIDTH / PixelRatio.get())
    : CAPTURE_PIXEL_WIDTH;

  return { width, height: Math.round(width * ratio) };
};

const BagFilmCardView: FC<Props> = ({ filmCard }) => {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const cardRef = useRef<View>(null);

  const ratio = filmCard.getRatio();
  const canvasAspect = CANVAS_SPECS[ratio].aspect;

  /**
   * 캔버스 크기(BS-10).
   *
   * 컨트롤이 전부 프리뷰 **위에** 뜨므로 세로를 예약할 자리가 없다 — 캔버스는 화면 폭을
   * 그대로 쓰고(좌우 여백 0), 화면비와 다른 만큼 위아래에 검은 배경이 남는다. 그 여백을
   * 없애려고 캔버스를 자르지 않는다.
   * 다만 세로로 아주 긴 비율(9:16)이 좁은 기기에서 화면 높이를 넘을 수 있어, 그때만
   * 높이에 맞춰 폭을 줄인다.
   */
  const canvasWidth = Math.max(
    MIN_CANVAS_WIDTH,
    Math.min(windowWidth, windowHeight / canvasAspect)
  );
  const canvasHeight = canvasWidth * canvasAspect;

  const polaroidWidth = canvasWidth * POLAROID_WIDTH_FRACTION;
  const packingListWidth = canvasWidth * PACKING_LIST_WIDTH_FRACTION[ratio];

  const sharing = filmCard.isSharing();
  const saving = filmCard.isSaving();
  const busy = filmCard.isBusy();

  /**
   * 폴라로이드를 **탭**하면 폴라로이드 사진 피커가 열린다(BS-9) — 배경 탭과 구분된다.
   * 훅이 ref로 붙잡는 콜백이라 참조를 고정한다.
   */
  const handleTapPolaroid = useCallback(() => {
    void filmCard.pickPolaroidPhoto();
  }, [filmCard]);

  /**
   * 요소마다 위치·배율·각도를 따로 가진다(BS-9) — 폴라로이드를 옮겨도 패킹리스트은 그대로다.
   * 꺼진 요소도 훅은 그대로 호출하고(훅 규칙), 다시 켜지면 `resetKey`가 바뀌어
   * 기본 배치로 돌아온다(BS-7).
   *
   * **기본 배치는 요소마다 다르다** — 폴라로이드는 좌측 상단, 패킹리스트은 우측 하단에서
   * 시작한다(BS-9). 둘 다 가운데면 나중에 켠 패킹리스트이 폴라로이드를 완전히 덮는다.
   */
  const polaroidTransform = useElementTransform({
    canvasWidth,
    canvasHeight,
    elementWidth: polaroidWidth,
    enabled: filmCard.isElementOn(FilmCardElement.Polaroid) && !busy,
    resetKey: filmCard.getElementKey(FilmCardElement.Polaroid),
    defaultCorner: FilmCardCorner.TopLeft,
    onTap: handleTapPolaroid,
  });
  /**
   * 패킹리스트에는 탭 동작이 없다(BS-9) — `onTap`을 넘기지 않으면 탭 제스처 자체가 붙지 않는다.
   *
   * 요소 탭은 **그 요소에만** 적용되는 것이 예측 가능하므로, 배경 사진이 없을 때도
   * 배경 피커로 넘기지 않는다. 배경은 배경(요소가 없는 자리) 탭이나 우측 상단 아이콘으로 고른다.
   */
  const packingListTransform = useElementTransform({
    canvasWidth,
    canvasHeight,
    elementWidth: packingListWidth,
    enabled: filmCard.isElementOn(FilmCardElement.PackingList) && !busy,
    resetKey: filmCard.getElementKey(FilmCardElement.PackingList),
    defaultCorner: FilmCardCorner.BottomRight,
  });

  const transforms: Record<FilmCardElement, ElementTransform> = {
    [FilmCardElement.Polaroid]: polaroidTransform,
    [FilmCardElement.PackingList]: packingListTransform,
  };

  // 켠 순서대로 들어오므로 그대로 넘기면 나중에 켠 요소가 위에 그려진다(BS-7).
  const activeElements = filmCard.getActiveElements();
  const canvasElements: FilmCardCanvasElement[] = activeElements.map(
    element => ({
      element,
      gesture: transforms[element].gesture,
      style: transforms[element].elementStyle,
      onLayout: transforms[element].handleLayoutElement,
    })
  );

  // 이벤트 핸들러가 아니라 모델에 넘기는 캡처 콜백이다.
  const captureCard = useCallback(async () => {
    return await captureRef(cardRef, {
      format: 'png',
      result: 'tmpfile',
      ...getCaptureSize(canvasAspect),
    });
  }, [canvasAspect]);

  const handlePressPhoto = () => {
    void filmCard.pickPhoto();
  };

  const handlePressShare = () => {
    void filmCard.share(captureCard);
  };

  const handlePressSave = () => {
    void filmCard.save(captureCard);
  };

  const handlePressBack = () => {
    router.back();
  };

  // 초기화는 켜져 있는 요소의 위치·배율·각도를 **모두 기본 배치로** 되돌린다(BS-9 — 가운데가
  // 아니다). 꺼진 요소를 함께 되돌려도 어차피 다시 켜질 때 초기화되므로 구분하지 않는다.
  const handlePressReset = () => {
    polaroidTransform.handleReset();
    packingListTransform.handleReset();
  };

  const elementChips: FilmCardChipOption[] = ELEMENT_OPTIONS.map(option => ({
    key: option,
    label: ELEMENT_SPECS[option].label,
    accessibilityLabel: ELEMENT_SPECS[option].accessibilityLabel,
    selected: filmCard.isElementOn(option),
    onPress: () => filmCard.toggleElement(option),
  }));

  const ratioChips: FilmCardChipOption[] = RATIO_OPTIONS.map(option => ({
    key: option,
    label: CANVAS_SPECS[option].label,
    accessibilityLabel: CANVAS_SPECS[option].accessibilityLabel,
    selected: filmCard.isRatioSelected(option),
    onPress: () => filmCard.selectRatio(option),
  }));

  return (
    // 앱에 전역 `GestureHandlerRootView`가 없어(각 화면이 필요할 때 직접 감싼다) 여기서 감싼다.
    // 이게 없으면 요소의 Pan·Pinch가 아예 동작하지 않는다. 중첩은 안전하고 비용이 없다.
    <GestureHandlerRootView style={styles.container}>
      {/* 네이티브 헤더를 쓰지 않는다(BS-10) — 헤더 바가 먹는 세로를 없애고 뒤로가기를
          오버레이의 플로팅 원형 버튼으로 대체한다. */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* 캔버스는 화면 폭을 꽉 채우고 세로 가운데에 놓인다. */}
      <View style={styles.canvasArea} pointerEvents='box-none'>
        <BagFilmCardCanvasView
          filmCard={filmCard}
          cardRef={cardRef}
          width={canvasWidth}
          height={canvasHeight}
          polaroidWidth={polaroidWidth}
          packingListWidth={packingListWidth}
          packingListItemLimit={PACKING_LIST_ITEM_LIMIT[ratio]}
          elements={canvasElements}
          onPressPhoto={handlePressPhoto}
        />
      </View>
      {/* 캡처 대상(`cardRef`)의 **형제**다. 캔버스 안에 넣으면 내보낸 이미지에 컨트롤이
          그대로 찍히므로 반드시 이 자리를 지킨다(BS-10). */}
      <BagFilmCardOverlayView
        elementChips={elementChips}
        ratioChips={ratioChips}
        hasPhoto={filmCard.hasPhoto()}
        busy={busy}
        sharing={sharing}
        saving={saving}
        showReset={activeElements.some(element => transforms[element].moved)}
        onPressBack={handlePressBack}
        onPressPhoto={handlePressPhoto}
        onPressReset={handlePressReset}
        onPressShare={handlePressShare}
        onPressSave={handlePressSave}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  canvasArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(BagFilmCardView);
