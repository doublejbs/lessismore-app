import { FC, useMemo, useState } from 'react';
import {
  ImageBackground,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextLayoutEventData,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import BagFilmCard from '@/model/bag-film-card/BagFilmCard';
import { PackingListItem } from '@/model/bag-film-card/PackingListItem';

interface Props {
  filmCard: BagFilmCard;
  // 패킹리스트 종이 폭(pt). 아래 치수는 **전부** 이 값에서 비례 계산한다 —
  // 고정 pt를 쓰면 비율(4:5 ↔ 9:16)이나 핀치 배율이 바뀔 때 레이아웃이 무너진다(BS-8).
  width: number;
  // 본문에 싣는 장비 수(BS-8). 비율마다 다르며 넘치는 개수는 `+N MORE`로 표시된다.
  itemLimit: number;
}

/**
 * 패킹리스트 종이 텍스처(BS-8). 옅은 구김이 이미 구워진 760×1600 오프화이트 이미지다.
 * 종이 자체가 오프화이트라 배경색을 덧칠하지 않는다 — 덧칠하면 구김이 죽는다.
 */
const PAPER_TEXTURE = require('@/assets/images/packing-list-paper.jpg');

/**
 * 종이 위 서체(BS-8) — **D2Coding 하나만 쓴다.**
 *
 * 이 컴포넌트는 앱 UI가 아니라 **내보내기 캔버스**라 `CLAUDE.md`의
 * "raw `<Text>` 금지 / `PretendardText`·디자인 토큰 사용" 규약의 예외 대상이다
 * (`BagFilmCardPolaroidView`가 같은 예외를 쓴다). 따라서 raw `<Text>`에
 * `fontFamily`를 직접 지정한다.
 *
 * D2Coding은 라틴·한글을 같은 손으로 그린 고정폭이라 두 폰트를 섞을 이유가 없고
 * (`PackingListItem.hasKoreanBrand`는 이 뷰에서 쓰지 않는다), 숫자 폭이 일정해
 * 무게 우측 정렬이 정확히 떨어진다. 폰트 패밀리 문자열은 `app/_layout.tsx`
 * `useFonts`의 등록 키와 같다.
 */
const FONT_REGULAR = 'D2Coding';
const FONT_BOLD = 'D2CodingBold';

// 잉크 색(BS-8). 종이 위에 얹히므로 순검정 대신 살짝 눅인 값을 쓴다.
const INK_COLOR = '#161616';
// 브랜드는 장비명보다 한 단 흐리게 — 장비명이 행의 주인공으로 읽혀야 한다.
const BRAND_COLOR = '#6E6E6C';

// 좌우 패딩 · 위아래 여백(종이 폭 대비).
const SIDE_PADDING_RATIO = 0.075;
const TOP_PADDING_RATIO = 0.075;
const BOTTOM_PADDING_RATIO = 0.075;

// 세로 간격(종이 폭 대비). 목업에서 확정된 값이라 pt를 하드코딩하지 않는다.
const DASH_TO_HEADER_RATIO = 0.035;
const HEADER_TO_DASH_RATIO = 0.046;
const DASH_TO_FIRST_ITEM_RATIO = 0.04;
const ITEM_GAP_RATIO = 0.02;
const ITEMS_TO_DASH_RATIO = 0.024;
const DASH_TO_TOTAL_RATIO = 0.042;
const TOTAL_TO_DASH_RATIO = 0.016;

// 글자 크기·줄 높이(종이 폭 대비).
const HEADER_FONT_RATIO = 0.032;
const HEADER_LINE_RATIO = 0.043;
const BRAND_FONT_RATIO = 0.026;
const BRAND_LINE_RATIO = 0.036;
const ITEM_FONT_RATIO = 0.032;
const ITEM_LINE_RATIO = 0.043;
const TOTAL_FONT_RATIO = 0.048;
const TOTAL_LINE_RATIO = 0.062;

/**
 * 무게 열 폭(종이 폭 대비)과 장비명과의 간격.
 *
 * **폭을 고정하는 이유**: 장비명이 두 줄이 되면 무게 자리에 `----`가 한 줄 더 붙는데,
 * 열 폭이 내용에 따라 흔들리면 장비명이 쓸 수 있는 폭도 같이 바뀌어
 * "두 줄 → 한 줄 → 두 줄"로 진동한다. D2Coding은 라틴 글리프가 0.5em이라
 * 6글자(`12345g`)가 정확히 3em = 폭의 0.096이며, 여기에 여유를 조금 더 둔다.
 */
const WEIGHT_COLUMN_RATIO = 0.1;
const NAME_TO_WEIGHT_GAP_RATIO = 0.03;

/**
 * 파선 구분선 치수(종이 폭 대비).
 *
 * `borderStyle: 'dashed'`를 쓰지 않는다 — RN에서 한 변만 dashed로 주면 Android가
 * 실선으로 그리거나 아예 그리지 않는다. 작은 View를 나열하면 두 플랫폼이 같은 결과를 내고
 * 캡처에도 그대로 들어간다(BS-8).
 */
const DASH_SEGMENT_RATIO = 0.018;
const DASH_GAP_RATIO = 0.012;
const DASH_THICKNESS_RATIO = 0.004;
const MIN_DASH_THICKNESS = 1;

// 장비명이 두 줄로 흘렀을 때 둘째 줄의 무게 자리에 찍는 표기(패킹리스트 관례, BS-8).
const CONTINUATION_MARK = '----';
// 장비명은 두 줄까지만 허용한다. 세 줄부터는 종이가 세로로 무너진다.
const MAX_NAME_LINES = 2;

type PackingListStyles = ReturnType<typeof createStyles>;

// 상·중·하단 파선 구분선(BS-8).
const DashedLineView: FC<{ styles: PackingListStyles; count: number }> = ({
  styles,
  count,
}) => (
  <View style={styles.dashRow}>
    {Array.from({ length: count }, (_unused, index) => (
      <View key={index} style={styles.dashSegment} />
    ))}
  </View>
);

/**
 * 본문 한 항목(BS-8) — 위에 브랜드를 작게 얹고, 아래에 장비명(좌) + 무게(우)를 놓는다.
 *
 * **긴 장비명은 두 줄로 흘리고 둘째 줄의 무게 자리에 `----`를 찍는다.** 한글은 고정폭에서
 * 라틴 두 칸을 먹어 자주 넘친다. RN에서는 미리 폭을 잴 수 없으므로 `onTextLayout`으로
 * 실제 줄 수를 받는다(`BagFilmCardPolaroidView`가 배낭 이름에 쓰는 방식과 같다).
 * 측정 결과에는 **측정 당시 조건(장비명·종이 폭)을 키로 함께 담아**, 조건이 바뀌면
 * 한 줄로 되돌아가 다시 측정되게 한다 — effect로 초기화하면 불필요한 연쇄 렌더가 생긴다.
 */
const PackingListItemView: FC<{
  item: PackingListItem;
  width: number;
  styles: PackingListStyles;
}> = ({ item, width, styles }) => {
  const measureKey = `${item.name}|${width}`;
  const [measured, setMeasured] = useState<{
    key: string;
    lineCount: number;
  } | null>(null);
  const lineCount = measured?.key === measureKey ? measured.lineCount : 1;

  const handleTextLayout = (
    event: NativeSyntheticEvent<TextLayoutEventData>
  ) => {
    const nextLineCount = Math.min(
      event.nativeEvent.lines.length,
      MAX_NAME_LINES
    );

    if (nextLineCount !== lineCount) {
      setMeasured({ key: measureKey, lineCount: nextLineCount });
    }
  };

  return (
    <View>
      {/* 브랜드가 비어도 줄 자리는 남긴다 — 그 항목만 위로 붙어 앞 항목에 딸린 것처럼 읽힌다.
          (브랜드 없는 장비는 실측상 드물지만, 하나만 어긋나도 목록 리듬이 깨진다.) */}
      <Text style={styles.brand} numberOfLines={1}>
        {item.brand}
      </Text>
      <View style={styles.itemLine}>
        <Text
          style={styles.itemName}
          numberOfLines={MAX_NAME_LINES}
          onTextLayout={handleTextLayout}
        >
          {item.name}
        </Text>
        {/* 무게 열은 폭이 고정이라(위 WEIGHT_COLUMN_RATIO 주석) `----`가 붙어도
            장비명이 쓸 수 있는 폭이 변하지 않는다 — 측정 루프가 돌지 않는다. */}
        <View style={styles.weightColumn}>
          <Text style={styles.itemWeight} numberOfLines={1}>
            {item.weightText}
          </Text>
          {lineCount > 1 ? (
            <Text style={styles.itemWeight} numberOfLines={1}>
              {CONTINUATION_MARK}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

/**
 * 패킹리스트 요소(BS-8) — 사진 위에 얹는 **오프화이트 종이**다.
 *
 * 제목·날짜·장소·바코드는 넣지 않는다. 높이는 내용이 정하며(고정 높이 금지),
 * 종이를 띄우는 그림자는 캔버스(`BagFilmCardCanvasView`)가 종이 뒤에 그린다 —
 * `elevation`·`shadow*`는 Android 소프트웨어 캔버스 캡처에 찍히지 않는다.
 */
const BagFilmCardPackingListView: FC<Props> = ({
  filmCard,
  width,
  itemLimit,
}) => {
  const styles = useMemo(() => createStyles(width), [width]);
  const dashCount = useMemo(() => {
    const contentWidth = width * (1 - SIDE_PADDING_RATIO * 2);
    const segment = width * DASH_SEGMENT_RATIO;
    const gap = width * DASH_GAP_RATIO;

    return Math.max(1, Math.floor((contentWidth + gap) / (segment + gap)));
  }, [width]);

  const items = filmCard.getPackingListItems(itemLimit);
  const hiddenCount = filmCard.getHiddenItemCount(itemLimit);

  return (
    <ImageBackground
      source={PAPER_TEXTURE}
      style={styles.paper}
      resizeMode='cover'
    >
      <DashedLineView styles={styles} count={dashCount} />
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>ITEM</Text>
        <Text style={styles.headerText}>WEIGHT</Text>
      </View>
      <DashedLineView styles={styles} count={dashCount} />
      <View style={styles.body}>
        {items.map((item, index) => (
          // 같은 장비가 두 번 담길 수 있어 이름만으로는 키가 겹친다.
          <View
            key={`${item.name}-${index}`}
            style={index > 0 ? styles.itemSpacing : null}
          >
            <PackingListItemView item={item} width={width} styles={styles} />
          </View>
        ))}
        {hiddenCount > 0 ? (
          <Text
            style={[styles.brand, items.length > 0 ? styles.itemSpacing : null]}
          >
            {`+${hiddenCount} MORE`}
          </Text>
        ) : null}
      </View>
      <DashedLineView styles={styles} count={dashCount} />
      <View style={styles.totalBlock}>
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>TOTAL ITEMS</Text>
          <Text style={styles.totalText}>{filmCard.getItemCountText()}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>TOTAL WEIGHT</Text>
          <Text style={styles.totalText}>{filmCard.getTotalWeightText()}</Text>
        </View>
      </View>
      <DashedLineView styles={styles} count={dashCount} />
    </ImageBackground>
  );
};

const createStyles = (width: number) => {
  const header = width * HEADER_FONT_RATIO;
  const brand = width * BRAND_FONT_RATIO;
  const itemName = width * ITEM_FONT_RATIO;
  const total = width * TOTAL_FONT_RATIO;
  const dashThickness = Math.max(
    MIN_DASH_THICKNESS,
    width * DASH_THICKNESS_RATIO
  );

  return StyleSheet.create({
    // 배경색을 주지 않는다 — 텍스처가 이미 오프화이트다(위 PAPER_TEXTURE 주석).
    paper: {
      width,
      paddingHorizontal: width * SIDE_PADDING_RATIO,
      paddingTop: width * TOP_PADDING_RATIO,
      paddingBottom: width * BOTTOM_PADDING_RATIO,
      // 알파 없는 사각 텍스처가 종이 밖으로 삐져나오지 않게 한다.
      // 그림자 레이어는 이 종이의 자식이 아니라 형제(캔버스 쪽)라 여기에 걸려도 잘리지 않는다.
      overflow: 'hidden',
    },
    dashRow: {
      flexDirection: 'row',
      gap: width * DASH_GAP_RATIO,
      overflow: 'hidden',
    },
    dashSegment: {
      width: width * DASH_SEGMENT_RATIO,
      height: dashThickness,
      backgroundColor: INK_COLOR,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: width * DASH_TO_HEADER_RATIO,
      marginBottom: width * HEADER_TO_DASH_RATIO,
    },
    headerText: {
      fontFamily: FONT_BOLD,
      fontSize: header,
      lineHeight: width * HEADER_LINE_RATIO,
      color: INK_COLOR,
    },
    body: {
      marginTop: width * DASH_TO_FIRST_ITEM_RATIO,
      marginBottom: width * ITEMS_TO_DASH_RATIO,
    },
    // 항목 **사이에만** 간격을 준다 — 브랜드↔장비명 간격과 같으면
    // 브랜드가 앞 항목에 딸린 것처럼 읽힌다(BS-8).
    itemSpacing: {
      marginTop: width * ITEM_GAP_RATIO,
    },
    brand: {
      fontFamily: FONT_REGULAR,
      fontSize: brand,
      lineHeight: width * BRAND_LINE_RATIO,
      color: BRAND_COLOR,
    },
    itemLine: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: width * NAME_TO_WEIGHT_GAP_RATIO,
    },
    itemName: {
      flex: 1,
      fontFamily: FONT_REGULAR,
      fontSize: itemName,
      lineHeight: width * ITEM_LINE_RATIO,
      color: INK_COLOR,
    },
    weightColumn: {
      width: width * WEIGHT_COLUMN_RATIO,
    },
    itemWeight: {
      fontFamily: FONT_REGULAR,
      fontSize: itemName,
      lineHeight: width * ITEM_LINE_RATIO,
      textAlign: 'right',
      color: INK_COLOR,
    },
    totalBlock: {
      marginTop: width * DASH_TO_TOTAL_RATIO,
      marginBottom: width * TOTAL_TO_DASH_RATIO,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    totalText: {
      fontFamily: FONT_BOLD,
      fontSize: total,
      lineHeight: width * TOTAL_LINE_RATIO,
      color: INK_COLOR,
    },
  });
};

export default observer(BagFilmCardPackingListView);
