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
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import FilmCardRatio from '@/model/bag-film-card/FilmCardRatio';
import BagFilmCardCanvasView from '@/components/bag-film-card/BagFilmCardCanvasView';
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
// 헤더 + 비율 칩 + 사진 고르기 버튼 + 하단 CTA가 쓰는 세로 공간(캔버스 최대 크기 산정용).
const RESERVED_HEIGHT = 340;
const MIN_CANVAS_WIDTH = 200;
// 이보다 작은 비율 변화는 되먹임 루프를 막기 위해 무시한다(handleLayoutCanvas 주석 참고).
const CARD_RATIO_EPSILON = 0.001;

/**
 * 비율별 캔버스 규격(BS-3).
 *
 * `aspect`는 캔버스 높이/너비이며 `null`이면 폴라로이드 내용이 높이를 정한다.
 * `polaroidFraction`은 캔버스 폭 대비 폴라로이드 폭으로, 좌우 여백이 자연스럽게
 * 남고 세로 여백이 가로보다 좁아지지 않도록 잡았다.
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
    polaroidFraction: 0.66,
  },
  [FilmCardRatio.Story]: {
    label: '9:16',
    accessibilityLabel: '9 대 16 비율',
    aspect: 16 / 9,
    polaroidFraction: 0.68,
  },
};

const RATIO_OPTIONS: readonly FilmCardRatio[] = [
  FilmCardRatio.Card,
  FilmCardRatio.Feed,
  FilmCardRatio.Story,
];

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
  const spec = CANVAS_SPECS[ratio];
  // 폴라로이드 단독은 내용이 높이를 정하므로 실측 비율을, 나머지는 고정 규격을 쓴다.
  const canvasRatio = spec.aspect ?? cardRatio;

  // 캔버스는 화면 폭에 맞추되, 하단 CTA를 가리지 않도록 남은 높이로도 한 번 더 제한한다.
  // 9:16처럼 세로로 긴 비율은 이 높이 제약이 실제로 폭을 결정한다.
  const canvasWidth = Math.max(
    MIN_CANVAS_WIDTH,
    Math.min(
      windowWidth - Spacing.screenH * 2,
      (windowHeight - RESERVED_HEIGHT - insets.top - insets.bottom) /
        canvasRatio
    )
  );
  const canvasHeight = spec.aspect === null ? null : canvasWidth * spec.aspect;
  const polaroidWidth = canvasWidth * spec.polaroidFraction;

  const sharing = filmCard.isSharing();
  const saving = filmCard.isSaving();
  const busy = filmCard.isBusy();

  const handleLayoutCanvas = (event: LayoutChangeEvent) => {
    // 4:5·9:16은 높이를 직접 지정하므로 실측값이 폴라로이드 비율이 아니다 — 덮어쓰지 않는다.
    if (spec.aspect !== null) {
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
    <View
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
          onPressPhoto={handlePressPhoto}
          onLayoutCanvas={handleLayoutCanvas}
        />
        <View style={styles.ratioRow}>
          {RATIO_OPTIONS.map(option => (
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
    </View>
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
    gap: 14,
  },
  ratioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
