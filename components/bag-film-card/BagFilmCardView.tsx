import { FC, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  PixelRatio,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import FilmCardRatio from '@/model/bag-film-card/FilmCardRatio';
import FilmCardTemplate from '@/model/bag-film-card/FilmCardTemplate';
import BagFilmCardCanvasView from '@/components/bag-film-card/BagFilmCardCanvasView';
import useSpecLabelTransform from '@/components/bag-film-card/useSpecLabelTransform';
import CategoryChipView from '@/components/browse/CategoryChipView';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  filmCard: BagFilmCard;
}

// LG-1: iOS만 네이티브 스택 헤더를 쓰고, Android/Web은 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 26 투명 헤더는 배경이 없어(고정 레이아웃 화면) 콘텐츠 상단 여백을 직접 확보한다.
const IOS_HEADER_BAR_HEIGHT = 44;

// SNS 업로드에 충분한 가로 해상도(BS-5).
const CAPTURE_PIXEL_WIDTH = 1080;
// 폴라로이드 높이/너비 비(대략 4:5). onLayout 실측 전 폴백으로만 쓴다.
const DEFAULT_CARD_RATIO = 1.25;
// 헤더 + 템플릿·비율 칩 + 사진 고르기 버튼 + 하단 CTA가 쓰는 세로 공간(캔버스 최대 크기 산정용).
const RESERVED_HEIGHT = 388;
// 라벨에서만 쓰는 위치 초기화 컨트롤 자리. 버튼이 나타났다 사라져도 캔버스 크기가 흔들리지
// 않도록 라벨 템플릿에서는 항상 이만큼을 비워 둔다.
const RESET_SLOT_HEIGHT = 44;
// 캔버스·칩·버튼 사이 세로 간격(styles.content의 gap과 같은 값).
const CONTENT_GAP = 14;
const MIN_CANVAS_WIDTH = 200;
// 이보다 작은 비율 변화는 되먹임 루프를 막기 위해 무시한다(handleLayoutCanvas 주석 참고).
const CARD_RATIO_EPSILON = 0.001;

/**
 * 비율별 캔버스 규격(BS-3).
 *
 * `aspect`는 캔버스 높이/너비이며 `null`이면 폴라로이드 내용이 높이를 정한다.
 * `polaroidFraction`은 캔버스 폭 대비 폴라로이드 폭이다. 폴라로이드가 배경 위에 놓인
 * 사진 한 장으로 보이도록 여백을 넉넉히 준다 — 4:5는 좌우 22%·상하 20%,
 * 9:16은 좌우 21%·상하 28%가 남는다.
 */
const CANVAS_SPECS: Record<
  FilmCardRatio,
  {
    label: string;
    accessibilityLabel: string;
    aspect: number | null;
    polaroidFraction: number;
  }
> = {
  [FilmCardRatio.Card]: {
    label: '카드',
    accessibilityLabel: '폴라로이드 카드 비율',
    aspect: null,
    polaroidFraction: 1,
  },
  [FilmCardRatio.Feed]: {
    label: '4:5',
    accessibilityLabel: '4 대 5 비율',
    aspect: 5 / 4,
    polaroidFraction: 0.56,
  },
  [FilmCardRatio.Story]: {
    label: '9:16',
    accessibilityLabel: '9 대 16 비율',
    aspect: 16 / 9,
    polaroidFraction: 0.58,
  },
};

/**
 * 템플릿별 비율 옵션(BS-7).
 *
 * 폴라로이드는 그 자체로 완결된 카드라 배경 없는 `카드` 출력이 성립하지만,
 * 영수증은 사진 배경 위에 놓인 종이라 성립하지 않는다.
 */
const RATIO_OPTIONS: Record<FilmCardTemplate, readonly FilmCardRatio[]> = {
  [FilmCardTemplate.Polaroid]: [
    FilmCardRatio.Card,
    FilmCardRatio.Feed,
    FilmCardRatio.Story,
  ],
  [FilmCardTemplate.Label]: [FilmCardRatio.Feed, FilmCardRatio.Story],
};

const TEMPLATE_SPECS: Record<
  FilmCardTemplate,
  { label: string; accessibilityLabel: string }
> = {
  [FilmCardTemplate.Polaroid]: {
    label: '폴라로이드',
    accessibilityLabel: '폴라로이드 템플릿',
  },
  [FilmCardTemplate.Label]: {
    label: '영수증',
    accessibilityLabel: '영수증 템플릿',
  },
};

const TEMPLATE_OPTIONS: readonly FilmCardTemplate[] = [
  FilmCardTemplate.Polaroid,
  FilmCardTemplate.Label,
];

/**
 * 영수증 규격(BS-8) — 캔버스 폭 대비 종이 폭과 본문에 싣는 장비 수.
 *
 * 종이를 이보다 좁히지 않는다: 40%까지 줄이면 브랜드 줄이 1080px 캡처 기준 약 11px이 되어
 * 피드에서 읽히지 않는다. 장비가 넘치면 종이를 줄이는 대신 목록을 자른다(`+N MORE`).
 * `카드`는 영수증에서 고를 수 없지만(모델이 4:5로 옮긴다) Record를 완전하게 두려고
 * 4:5와 같은 값을 넣는다.
 */
const LABEL_BLOCK_FRACTION: Record<FilmCardRatio, number> = {
  [FilmCardRatio.Card]: 0.44,
  [FilmCardRatio.Feed]: 0.44,
  [FilmCardRatio.Story]: 0.48,
};

const LABEL_ITEM_LIMIT: Record<FilmCardRatio, number> = {
  [FilmCardRatio.Card]: 8,
  [FilmCardRatio.Feed]: 8,
  [FilmCardRatio.Story]: 14,
};

// 영수증 캔버스는 항상 고정 규격이라 폴라로이드의 실측 비율을 쓰지 않는다. 모델이 비율을
// 보정하기 전 프레임에 `카드`가 남아 있어도 이 값(4:5)으로 떨어뜨린다.
const LABEL_DEFAULT_ASPECT = 5 / 4;

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
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [cardRatio, setCardRatio] = useState(DEFAULT_CARD_RATIO);

  const ratio = filmCard.getRatio();
  const template = filmCard.getTemplate();
  const isLabel = template === FilmCardTemplate.Label;
  const spec = CANVAS_SPECS[ratio];
  // 라벨은 사진이 캔버스를 채우므로 언제나 고정 규격이다(위 LABEL_DEFAULT_ASPECT 주석).
  const canvasAspect = isLabel
    ? (spec.aspect ?? LABEL_DEFAULT_ASPECT)
    : spec.aspect;
  // 폴라로이드 단독은 내용이 높이를 정하므로 실측 비율을, 나머지는 고정 규격을 쓴다.
  const canvasRatio = canvasAspect ?? cardRatio;

  // 캔버스는 화면 폭에 맞추되, 하단 CTA를 가리지 않도록 남은 높이로도 한 번 더 제한한다.
  // 9:16처럼 세로로 긴 비율은 이 높이 제약이 실제로 폭을 결정한다.
  const canvasWidth = Math.max(
    MIN_CANVAS_WIDTH,
    Math.min(
      windowWidth - Spacing.screenH * 2,
      (windowHeight -
        RESERVED_HEIGHT -
        (isLabel ? RESET_SLOT_HEIGHT + CONTENT_GAP : 0) -
        insets.top -
        insets.bottom) /
        canvasRatio
    )
  );
  const canvasHeight =
    canvasAspect === null ? null : canvasWidth * canvasAspect;
  const polaroidWidth = canvasWidth * spec.polaroidFraction;
  const labelWidth = canvasWidth * LABEL_BLOCK_FRACTION[ratio];

  const sharing = filmCard.isSharing();
  const saving = filmCard.isSaving();
  const busy = filmCard.isBusy();

  // 영수증 종이 이동·확대(BS-9). 폴라로이드에서도 훅은 호출하되 캔버스가 쓰지 않는다.
  const labelTransform = useSpecLabelTransform({
    canvasWidth,
    canvasHeight: canvasHeight ?? canvasWidth,
    blockWidth: labelWidth,
    enabled: isLabel && !busy,
  });

  const handleLayoutCanvas = (event: LayoutChangeEvent) => {
    // 4:5·9:16과 라벨은 높이를 직접 지정하므로 실측값이 폴라로이드 비율이 아니다 — 덮어쓰지 않는다.
    if (canvasAspect !== null) {
      return;
    }

    const { width, height } = event.nativeEvent.layout;

    if (width <= 0 || height <= 0) {
      return;
    }

    const measured = height / width;

    // canvasWidth가 cardRatio에서 나오고 onLayout이 다시 cardRatio를 갱신하는 되먹임 구조다.
    // 텍스트 레이아웃 반올림으로 ±ε 진동하면 렌더 루프가 되므로 그 폭의 변화는 무시한다.
    setCardRatio(previous =>
      Math.abs(previous - measured) < CARD_RATIO_EPSILON ? previous : measured
    );
  };

  // 이벤트 핸들러가 아니라 모델에 넘기는 캡처 콜백이다.
  const captureCard = useCallback(async () => {
    return await captureRef(cardRef, {
      format: 'png',
      result: 'tmpfile',
      ...getCaptureSize(canvasRatio),
    });
  }, [canvasRatio]);

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

  return (
    // 앱에 전역 `GestureHandlerRootView`가 없어(각 화면이 필요할 때 직접 감싼다) 여기서 감싼다.
    // 이게 없으면 라벨 블록의 Pan·Pinch가 아예 동작하지 않는다. 중첩은 안전하고 비용이 없다.
    <GestureHandlerRootView
      style={[
        styles.container,
        IS_IOS ? { paddingTop: insets.top + IOS_HEADER_BAR_HEIGHT } : null,
      ]}
    >
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '필름 카드',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handlePressBack}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel='뒤로가기'
          >
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
          <PretendardText style={styles.headerTitle} weight='bold'>
            필름 카드
          </PretendardText>
        </View>
      )}
      <View style={styles.content}>
        <BagFilmCardCanvasView
          filmCard={filmCard}
          cardRef={cardRef}
          width={canvasWidth}
          height={canvasHeight}
          polaroidWidth={polaroidWidth}
          labelWidth={labelWidth}
          labelItemLimit={LABEL_ITEM_LIMIT[ratio]}
          labelGesture={labelTransform.gesture}
          labelStyle={labelTransform.blockStyle}
          onLayoutLabel={labelTransform.handleLayoutBlock}
          onPressPhoto={handlePressPhoto}
          onLayoutCanvas={handleLayoutCanvas}
        />
        {/* 영수증을 옮긴 뒤에만 노출한다 — 기본 위치에서는 할 일이 없는 컨트롤이다(BS-9).
            캡처 대상 캔버스 **밖**에 두어야 내보낸 이미지에 찍히지 않는다. */}
        {isLabel ? (
          <View style={styles.resetSlot}>
            {labelTransform.moved ? (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={labelTransform.handleReset}
                disabled={busy}
                accessibilityRole='button'
                accessibilityLabel='영수증 위치 초기화'
              >
                <Ionicons
                  name='refresh'
                  size={16}
                  color={Color.textSecondary}
                />
                <PretendardText style={styles.resetButtonText} weight='medium'>
                  위치 초기화
                </PretendardText>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        <View style={styles.chipRow}>
          {TEMPLATE_OPTIONS.map(option => (
            <CategoryChipView
              key={option}
              label={TEMPLATE_SPECS[option].label}
              accessibilityLabel={TEMPLATE_SPECS[option].accessibilityLabel}
              selected={filmCard.isTemplateSelected(option)}
              onPress={() => filmCard.selectTemplate(option)}
            />
          ))}
        </View>
        <View style={styles.chipRow}>
          {RATIO_OPTIONS[template].map(option => (
            <CategoryChipView
              key={option}
              label={CANVAS_SPECS[option].label}
              accessibilityLabel={CANVAS_SPECS[option].accessibilityLabel}
              selected={filmCard.isRatioSelected(option)}
              onPress={() => filmCard.selectRatio(option)}
            />
          ))}
        </View>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePressPhoto}
          disabled={busy}
          accessibilityRole='button'
          accessibilityLabel={
            filmCard.hasPhoto() ? '사진 다시 고르기' : '사진 고르기'
          }
        >
          <Ionicons
            name='images-outline'
            size={16}
            color={Color.textSecondary}
          />
          <PretendardText style={styles.photoButtonText} weight='medium'>
            {filmCard.hasPhoto() ? '사진 다시 고르기' : '사진 고르기'}
          </PretendardText>
        </TouchableOpacity>
      </View>
      <View style={styles.ctaArea}>
        <TouchableOpacity
          style={[styles.shareButton, busy ? styles.buttonDisabled : null]}
          onPress={handlePressShare}
          disabled={busy}
          accessibilityRole='button'
          accessibilityLabel='공유하기'
        >
          {sharing ? (
            <ActivityIndicator size='small' color={Color.background} />
          ) : (
            <PretendardText style={styles.shareButtonText} weight='semibold'>
              공유하기
            </PretendardText>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handlePressSave}
          disabled={busy}
          accessibilityRole='button'
          accessibilityLabel='갤러리에 저장'
        >
          {saving ? (
            <ActivityIndicator size='small' color={Color.textSecondary} />
          ) : (
            <PretendardText style={styles.saveButtonText} weight='medium'>
              갤러리에 저장
            </PretendardText>
          )}
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 17,
    color: Color.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: CONTENT_GAP,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetSlot: {
    height: RESET_SLOT_HEIGHT,
    justifyContent: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  resetButtonText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  photoButtonText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  ctaArea: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 8,
    gap: 4,
  },
  shareButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.input,
    backgroundColor: Color.chipActiveBg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    fontSize: 16,
    color: Color.background,
  },
  saveButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
});

export default observer(BagFilmCardView);
