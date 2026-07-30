import { FC, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';

interface Props {
  filmCard: BagFilmCard;
  // 폴라로이드 렌더 폭(pt). 내부 치수는 모두 이 값에서 비례 계산한다.
  width: number;
}

// 아래 치수의 기준이 되는 폴라로이드 폭. 목업 수치를 이 폭 기준으로 잡았다.
const BASE_WIDTH = 300;

// 캡션 손글씨 폰트(BS-3). 카드는 앱 디자인 토큰이 아니라 내보내기 캔버스 팔레트를 따르므로
// PretendardText·Color 토큰 대신 폰트·색을 직접 지정한다(CLAUDE.md 내보내기 캔버스 예외).
/**
 * 캡션 폰트(BS-3). **라틴·숫자·한글을 한 폰트로 쓴다.**
 *
 * 이전에는 라틴을 Permanent Marker, 한글을 별도 손글씨로 섞었는데 두 손글씨의 결·굵기를
 * 맞추는 데 계속 실패했다. 나눔손글씨는 **라틴·숫자도 같은 손으로 그려져 있어서**, 하나로
 * 통일하면 정의상 완벽히 맞는다. 폰트 이원화가 사라져 크기 보정 계산도 필요 없다.
 *
 * 나눔손글씨 미래나무(네이버 한글한글아름답게) — Google Fonts 패키지가 아니라 번들한
 * 로컬 TTF라 폰트 패밀리 문자열이 useFonts 키다.
 */
const CAPTION_FONT = 'NanumMiRaeNaMu';
// 한글이 baseline 아래 -0.197em까지 내려가 받침이 잘릴 수 있다. 폰트 자연 줄높이(1.15배)로는
// 여유가 0.6pt뿐이라 조금 더 준다. 이름은 기록이 있을 때 좌측 열에 오고 그 열이 캡션 높이를
// 정하므로, 이 값은 카드 비율에도 영향을 준다.
const BAG_NAME_LINE_HEIGHT_RATIO = 1.25;

/**
 * 인화지 텍스처(BS-3). 그레인·섬유질 얼룩·가장자리 음영·광택이 이미 구워져 있는 1080×1352
 * 이미지로, 카드 배경에 깔린다. 사진 창이 뚫려 있지 않아 좌표 하드코딩이 필요 없고
 * 사진·캡션은 그 위에 그대로 렌더된다.
 *
 * 텍스처 비율 1352/1080 = 1.2519로 카드 비율(약 1.25)과 사실상 같아 `cover`로 깔아도
 * 잘리는 양이 0.2% 미만이다 — `stretch`와 달리 왜곡이 전혀 없어 `cover`를 쓴다.
 */
const PAPER_TEXTURE = require('@/assets/images/film-frame-paper.jpg');

const INK_COLOR = '#000000';

/**
 * 사진 변경 단서(BS-3). 사진 영역 우하단에 얹는 작은 아이콘 배지다.
 *
 * 사진 위에 놓이므로 반투명 검정 위 흰 아이콘으로 두어 밝은 사진에서도 보이게 한다.
 * 크기는 인화물 폭에 비례해야 배율을 바꿔도 비율이 유지된다.
 */
const PHOTO_HINT_ICON_RATIO = 0.075;
const PHOTO_HINT_COLOR = 'rgba(255, 255, 255, 0.95)';
const PHOTO_HINT_BG_COLOR = 'rgba(0, 0, 0, 0.42)';

// 인화지는 완벽한 직각이 아니다 — 아주 작게만 둥글린다(과하면 스티커처럼 보인다).
// 텍스처가 알파 없는 사각 이미지라 모서리는 RN이 잘라줘야 한다(card의 overflow: 'hidden').
const FRAME_RADIUS = 2;
// 사진을 고르지 않아도 카드가 완성되도록 하는 단색 배경(BS-2). 앱 브랜드 톤의 짙은 회색.
// `사진 고르기` 안내는 이 안이 아니라 캔버스 전체가 맡는다(BS-2) — 배경 사진이 없는 동안에는
// 폴라로이드를 탭해도 배경 피커가 열리므로(BS-9) 안내를 두 곳에 겹쳐 둘 이유가 없다.
const EMPTY_PHOTO_COLOR = '#151515';
// 사진과 인화지 사이 경계. 눈에 띄면 안 되는 수준으로만 둔다.
const PHOTO_EDGE_COLOR = 'rgba(0, 0, 0, 0.07)';

/**
 * 필름(폴라로이드) 카드 — 흰 프레임 안에 정사각 사진, 아래 좌·우 2열 캡션(BS-3).
 * 좌우 여백보다 아래 여백이 넓어 폴라로이드 비율(대략 4:5)이 된다.
 */
const CaptionView: FC<{
  filmCard: BagFilmCard;
  styles: ReturnType<typeof createStyles>;
}> = ({ filmCard, styles }) => {
  const distanceText = filmCard.getDistanceText();
  const bagNameText = filmCard.getBagNameText();
  const hasActivity = filmCard.hasActivity() && !!distanceText;
  // 한 줄에 들어가는 만큼만 남긴 이름(아래 renderBagName 참고). 측정 결과에 측정 당시의
  // 조건(이름·열 배치)을 키로 함께 담아, 조건이 바뀌면 자동으로 원본으로 되돌아가 다시
  // 측정되게 한다 — effect로 초기화하면 불필요한 연쇄 렌더가 생긴다.
  const measureKey = `${bagNameText ?? ''}|${hasActivity}`;
  const [measured, setMeasured] = useState<{
    key: string;
    text: string;
  } | null>(null);
  const nameText = measured?.key === measureKey ? measured.text : bagNameText;

  // 이름은 길이 제한이 없는 자유 입력이다. 크기를 줄이거나 말줄임(`…`)을 붙이거나 두 줄로
  // 접지 않고, **한 줄에 들어가는 단어까지만 보여주고 나머지는 버린다**.
  //
  // RN의 `numberOfLines={1}`은 픽셀 기준으로 잘라 단어 중간이 끊기므로 쓸 수 없다. 대신
  // 줄 수 제한 없이 한 번 렌더해 `onTextLayout`으로 실제 줄바꿈 결과를 받고(RN의 기본
  // 줄바꿈이 공백 기준이다), 첫 줄 텍스트만 남겨 다시 렌더한다. 두 번째 렌더는 한 줄이라
  // 콜백이 다시 잘라내지 않아 루프가 돌지 않는다.
  const renderBagName = () =>
    bagNameText ? (
      <Text
        style={styles.bagNameText}
        onTextLayout={event => {
          const { lines } = event.nativeEvent;

          if (lines.length > 1) {
            setMeasured({ key: measureKey, text: lines[0].text.trimEnd() });
          }
        }}
      >
        {nameText}
      </Text>
    ) : null;

  /**
   * 캡션 구성(BS-4). 좌 [이름 · 날짜] / 우 [무게 · 거리] 한 가지 배치만 쓴다 —
   * 좌측이 "언제 어디", 우측이 "얼마를 지고 얼마나"로 묶여 읽힌다.
   * 네 값 모두 같은 크기라 히어로가 없고 2×2 그리드로 나란히 놓인다.
   *
   * 운동 기록이 없으면 **거리 한 줄만 빠진다** — 배치를 따로 만들지 않는다.
   * 그래도 캡션 높이는 2행인 좌측 열이 정하므로 카드 비율은 두 경우가 같다.
   */
  return (
    <View style={styles.caption}>
      <View style={styles.leftColumn}>
        {renderBagName()}
        <Text style={styles.dateText}>{filmCard.getDateText()}</Text>
      </View>
      <View style={styles.rightColumn}>
        <Text style={styles.weightText}>{filmCard.getWeightText()}</Text>
        {hasActivity ? (
          <Text style={styles.rightBigText}>{distanceText}</Text>
        ) : null}
      </View>
    </View>
  );
};

const BagFilmCardPolaroidView: FC<Props> = ({ filmCard, width }) => {
  const styles = useMemo(() => createStyles(width), [width]);
  const photoUri = filmCard.getPolaroidPhotoUri();
  // 탭하면 사진을 바꿀 수 있다는 단서(BS-3). 단서가 없으면 탭할 수 있다는 걸 알 방법이 없다.
  // 화면용이므로 **캡처 프레임에서는 감춘다** — 결과물에 배지가 찍히면 안 된다.
  const showPhotoHint = !filmCard.isCapturing();

  return (
    <View style={styles.card}>
      {/* 인화지 텍스처 — 사진·캡션보다 먼저 선언해 그 아래에 깔린다(사진은 원본 그대로 유지).
          사진 창이 뚫린 프레임이 아니라 종이 전체 텍스처라 좌표를 맞출 필요가 없다. */}
      <Image source={PAPER_TEXTURE} style={styles.paper} resizeMode='cover' />
      {/* 인화물 안 사진은 **기본이 배경과 같은 사진**이다(BS-3) — 한 번만 골라도 카드가
          완성되고, 폴라로이드를 탭해 따로 고르면 그때부터 배경과 갈린다(BS-9). */}
      <View style={styles.photo}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.photoImage}
            resizeMode='cover'
          />
        ) : null}
        {showPhotoHint ? (
          <View style={styles.photoHint} pointerEvents='none'>
            <Ionicons
              name='image-outline'
              size={width * PHOTO_HINT_ICON_RATIO}
              color={PHOTO_HINT_COLOR}
            />
          </View>
        ) : null}
      </View>
      <CaptionView filmCard={filmCard} styles={styles} />
    </View>
  );
};

const createStyles = (width: number) => {
  const scale = width / BASE_WIDTH;
  // 미래나무 라틴 글리프 높이 0.710em 기준으로 잡은 값이다. 한 폰트라 언어별 보정이
  // 필요 없고, 한글(0.770em)이 라틴보다 살짝 크게 그려져 이름이 자연히 조금 더 큼직해진다.
  // **네 값 모두 같은 크기**다 — 이름·날짜·무게·거리가 그 여행을 함께 설명하는 기록이라
  // 한쪽을 히어로로 세우지 않고 2×2 그리드로 나란히 읽히게 한다.
  // 폭 예산: 캡션 안쪽 260 − 우측 최대(`999.9 KM` = 95) − 간격 10 = 155.
  // `설악산 백패킹`(112)까지 들어가고, 더 긴 이름은 들어가는 단어까지만 남는다.
  const CAPTION_SIZE = 30;
  const weight = CAPTION_SIZE * scale;
  const date = CAPTION_SIZE * scale;
  const rightBig = CAPTION_SIZE * scale;
  const bagName = CAPTION_SIZE * scale;

  return StyleSheet.create({
    card: {
      width,
      borderRadius: FRAME_RADIUS * scale,
      // 알파 없는 사각 텍스처가 둥근 모서리 밖으로 삐져나오지 않게 한다.
      // 그림자 레이어는 이 카드의 자식이 아니라 형제(캔버스 쪽)라 여기에 걸려도 잘리지 않는다.
      overflow: 'hidden',
      paddingHorizontal: 15 * scale,
      paddingTop: 15 * scale,
      // 좌우보다 넓은 하단 여백이 폴라로이드의 정체성이다. 캡션 높이가 카드 비율을 정하며
      // 현재 약 1.33이다 — 텍스처(1080×1440 = 1.333)를 이 비율에 맞춰 만들어 뒀다.
      // 캡션 크기·행 수를 바꾸면 비율이 달라지니 텍스처도 함께 다시 만들어야 한다.
      paddingBottom: 15 * scale,
    },
    paper: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: undefined,
      height: undefined,
    },
    photo: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: EMPTY_PHOTO_COLOR,
      overflow: 'hidden',
      // 사진과 흰 프레임 사이의 아주 옅은 경계 — 실물 인화지에서 유제면이 종이보다
      // 살짝 들어가 보이는 느낌. 밝은 사진이 프레임과 뭉개지는 것도 막아준다.
      borderWidth: Math.max(StyleSheet.hairlineWidth, 0.6 * scale),
      borderColor: PHOTO_EDGE_COLOR,
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    // 사진 영역 우하단 배지 — 캡션을 가리지 않고, 인화물을 탭하면 사진을 바꾼다는 단서다.
    photoHint: {
      position: 'absolute',
      right: 8 * scale,
      bottom: 8 * scale,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 5 * scale,
      borderRadius: 999,
      backgroundColor: PHOTO_HINT_BG_COLOR,
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
    /**
     * 폭이 모자라면 **줄어드는 쪽은 언제나 이 열**이다(BS-3).
     *
     * 이름만 길이가 예측되지 않는 자유 입력이라는 이유도 있지만, 이 열이 줄어들어야
     * 이름이 줄바꿈되고 그래야 위 `renderBagName`의 첫 줄 측정이 발동한다 —
     * 반대로 두면 잘림 규칙 자체가 죽는다.
     */
    leftColumn: {
      flexShrink: 1,
    },
    // 무게·거리는 짧은 고정 형식이라 줄이지 않는다 — 줄어들면 `3.8 KG`가 글자 단위로 접힌다(BS-3).
    rightColumn: {
      flexShrink: 0,
      alignItems: 'flex-end',
    },
    // 총 무게.
    weightText: {
      fontFamily: CAPTION_FONT,
      fontSize: weight,
      lineHeight: weight * 1.15,
      color: INK_COLOR,
    },
    // 좌·작: 날짜.
    dateText: {
      fontFamily: CAPTION_FONT,
      fontSize: date,
      lineHeight: date * 1.2,
      marginTop: 7 * scale,
      color: INK_COLOR,
    },
    // 이동 거리.
    rightBigText: {
      fontFamily: CAPTION_FONT,
      fontSize: rightBig,
      lineHeight: rightBig * 1.15,
      textAlign: 'right',
      color: INK_COLOR,
    },
    // 우·큰 대체: 배낭 이름. 거리 값과 같은 크기를 쓴다(위 createStyles 주석).
    bagNameText: {
      fontFamily: CAPTION_FONT,
      fontSize: bagName,
      lineHeight: bagName * BAG_NAME_LINE_HEIGHT_RATIO,
      textAlign: 'right',
      color: INK_COLOR,
    },
  });
};

export default observer(BagFilmCardPolaroidView);
