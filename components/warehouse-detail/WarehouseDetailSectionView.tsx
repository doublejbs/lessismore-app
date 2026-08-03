import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '../PretendardText';
import AcgHighlightText from '@/components/acg/AcgHighlightText';
import { Acg, AcgLayout, AcgShadow } from '@/constants/DesignTokens';

interface Props {
  title: string;
  // 형광펜 띠. **화면당 한 섹션에만 준다** — 여러 곳에 주면 강조가 강조를 지운다.
  highlight?: boolean;
  // 제목 줄 우측에 붙는 요약(예: 리뷰 평점). 제목이 면 밖으로 나가면서 제목과 짝지어
  // 읽히던 요약도 같이 나와야 한다.
  accessory?: ReactNode;
  // 'card'(기본): 내용 전체를 종이 면 하나에 담는다 — 표·지표처럼 한 덩어리인 내용용.
  // 'list': 면을 두지 않고 자식 행이 각자 종이 면을 갖는다. 홈 탭 리스트와 같은 문법이라
  //   행 수가 늘어도 카드가 길어지는 대신 행이 늘어나 스크롤에서 항목이 세어진다.
  variant?: 'card' | 'list';
  children: ReactNode;
}

/**
 * 장비 상세의 섹션 껍데기(ACG).
 *
 * 홈 탭과 같은 문법이다: 제목은 지면 위에 두고 내용만 종이 면에 얹는다. 제목까지 면 안에
 * 넣으면 카드가 제목·내용 두 층을 품어 스크롤에서 섹션 경계가 흐려진다.
 */
const WarehouseDetailSectionView: FC<Props> = ({
  title,
  highlight = false,
  accessory,
  variant = 'card',
  children,
}) => {
  const titleText = (
    <PretendardText weight='bold' style={styles.title}>
      {title}
    </PretendardText>
  );

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        {highlight ? (
          <AcgHighlightText fontSize={SECTION_TITLE_SIZE}>
            {titleText}
          </AcgHighlightText>
        ) : (
          titleText
        )}
        {accessory}
      </View>

      <View style={variant === 'card' ? styles.card : styles.list}>
        {children}
      </View>
    </View>
  );
};

// 섹션 제목 크기(ACG) — 홈 탭과 같은 18px/700.
const SECTION_TITLE_SIZE = 18;

const styles = StyleSheet.create({
  section: {
    marginHorizontal: AcgLayout.screenH,
    marginBottom: 22,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  // 지면 위 제목이라 본문보다 한 단계 낮은 색이다(홈 탭과 동일).
  title: {
    fontSize: SECTION_TITLE_SIZE,
    color: Acg.textTertiary,
  },
  card: {
    padding: 16,
    backgroundColor: Acg.paper,
    boxShadow: AcgShadow.paper,
  },
  // 행 사이 8px — 홈 탭 리스트와 같은 값.
  list: {
    gap: 8,
  },
});

export default WarehouseDetailSectionView;
