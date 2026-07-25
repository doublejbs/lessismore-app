import { FC, RefObject, useMemo } from 'react';
import {
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import PretendardText from '@/components/PretendardText';

interface Props {
  filmCard: BagFilmCard;
  // 캡처 대상 View의 ref. observer 래핑 컴포넌트라 ref를 명시 prop으로 받는다.
  cardRef: RefObject<View | null>;
  // 카드 실제 렌더 폭(pt). 내부 치수는 모두 이 값에서 비례 계산한다.
  width: number;
  onPressPhoto: () => void;
  onLayoutCard: (event: LayoutChangeEvent) => void;
}

// 아래 치수의 기준이 되는 카드 폭. 목업(폴라로이드) 수치를 이 폭 기준으로 잡았다.
const BASE_WIDTH = 300;

// 캡션 손글씨 폰트(BS-3). 카드는 앱 디자인 토큰이 아니라 내보내기 캔버스 팔레트를 따르므로
// PretendardText·Color 토큰 대신 폰트·색을 직접 지정한다(CLAUDE.md 내보내기 캔버스 예외).
const LATIN_FONT = 'NothingYouCouldDo_400Regular';
const KOREAN_FONT = 'NanumBrushScript_400Regular';

const FRAME_COLOR = '#FFFFFF';
const INK_COLOR = '#000000';
const MARK_COLOR = '#C0C0C0';
// 사진을 고르지 않아도 카드가 완성되도록 하는 단색 배경(BS-2). 앱 브랜드 톤의 짙은 회색.
const EMPTY_PHOTO_COLOR = '#151515';

/**
 * 필름(폴라로이드) 카드 — 캡처 대상 캔버스(BS-3).
 *
 * 흰 프레임 안에 정사각 사진, 아래 좌·우 2열 캡션, 맨 아래 `useless` 워드마크.
 * 좌우 여백보다 아래 여백이 넓어 폴라로이드 비율(대략 4:5)이 된다.
 */
const BagFilmCardCanvasView: FC<Props> = ({
  filmCard,
  cardRef,
  width,
  onPressPhoto,
  onLayoutCard,
}) => {
  const styles = useMemo(() => createStyles(width), [width]);
  const photoUri = filmCard.getPhotoUri();
  const capturing = filmCard.isCapturing();
  const distanceText = filmCard.getDistanceText();
  const speedText = filmCard.getSpeedText();
  const placeText = filmCard.getPlaceText();

  // BS-4: 운동 기록이 있으면 거리·속도, 없으면 장소, 둘 다 없으면 우측 열을 비운다.
  const renderRightColumn = () => {
    if (filmCard.hasActivity() && distanceText) {
      return (
        <View style={styles.rightColumn}>
          <Text style={[styles.bigText, styles.rightText]}>{distanceText}</Text>
          {speedText ? (
            <Text
              style={[styles.smallText, styles.rightText, styles.speedText]}
            >
              {speedText}
            </Text>
          ) : null}
        </View>
      );
    }

    if (placeText) {
      return (
        <View style={styles.rightColumn}>
          <Text style={styles.placeText} numberOfLines={2}>
            {placeText}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View
      ref={cardRef}
      style={styles.card}
      onLayout={onLayoutCard}
      // Android가 캡처 대상 View를 레이아웃에서 합쳐 없애지 않도록 한다.
      collapsable={false}
    >
      {/* 캡처·공유 중 탭을 막는다 — 캡처 도중 피커가 뜨면 빈/잘린 이미지가 나가거나
          공유된 이미지와 화면이 어긋난다. 화면 하단에 같은 동작의 레이블된 버튼이
          따로 있어, 스크린 리더에는 이 영역을 중복 노출하지 않는다. */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressPhoto}
        disabled={filmCard.isBusy()}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
      >
        <View style={styles.photo}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.photoImage}
              resizeMode='cover'
            />
          ) : null}
          {/* 안내는 화면용이라 캡처 프레임에서는 감춘다 — 사진 없이도 단색 배경으로 완성된다(BS-2). */}
          {!photoUri && !capturing ? (
            <View style={styles.placeholder}>
              <Ionicons
                name='image-outline'
                size={Math.round(28 * (width / BASE_WIDTH))}
                color={FRAME_COLOR}
              />
              <PretendardText style={styles.placeholderText} weight='medium'>
                사진 고르기
              </PretendardText>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      <View style={styles.caption}>
        <View style={styles.leftColumn}>
          <Text style={styles.bigText}>{filmCard.getDateText()}</Text>
          <Text style={styles.smallText}>{filmCard.getWeightText()}</Text>
        </View>
        {renderRightColumn()}
      </View>
      <PretendardText style={styles.mark} weight='medium'>
        useless
      </PretendardText>
    </View>
  );
};

const createStyles = (width: number) => {
  const scale = width / BASE_WIDTH;
  const big = 21 * scale;
  const small = 15 * scale;
  // 한글 붓글씨는 같은 포인트에서 훨씬 작아 보여 영문 대비 크기를 키워 맞춘다(BS-3).
  const place = 30 * scale;

  return StyleSheet.create({
    card: {
      width,
      backgroundColor: FRAME_COLOR,
      paddingHorizontal: 15 * scale,
      paddingTop: 15 * scale,
    },
    photo: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: EMPTY_PHOTO_COLOR,
      overflow: 'hidden',
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    placeholder: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8 * scale,
    },
    placeholderText: {
      fontSize: 13 * scale,
      color: FRAME_COLOR,
    },
    caption: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10 * scale,
      paddingTop: 17 * scale,
      paddingHorizontal: 5 * scale,
      paddingBottom: 4 * scale,
    },
    leftColumn: {
      flexShrink: 0,
    },
    rightColumn: {
      flexShrink: 1,
      alignItems: 'flex-end',
    },
    bigText: {
      fontFamily: LATIN_FONT,
      fontSize: big,
      lineHeight: big * 1.15,
      color: INK_COLOR,
    },
    smallText: {
      fontFamily: LATIN_FONT,
      fontSize: small,
      lineHeight: small * 1.2,
      marginTop: 7 * scale,
      color: INK_COLOR,
    },
    rightText: {
      textAlign: 'right',
    },
    // 이 손글씨체의 슬래시가 세로줄에 가까워 `KM/H`가 `KMIH`로 읽히기 쉬워,
    // 자간을 벌려 슬래시를 글자가 아닌 구분자로 읽히게 한다.
    speedText: {
      letterSpacing: 1.6 * scale,
    },
    placeText: {
      fontFamily: KOREAN_FONT,
      fontSize: place,
      lineHeight: place * 1.1,
      textAlign: 'right',
      color: INK_COLOR,
    },
    mark: {
      fontSize: 9 * scale,
      letterSpacing: 2.5 * scale,
      color: MARK_COLOR,
      textAlign: 'center',
      paddingBottom: 11 * scale,
    },
  });
};

export default observer(BagFilmCardCanvasView);
