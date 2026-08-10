import { FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
import InfoSubScreenHeaderView, {
  IOS_EDGES,
  IS_IOS,
  NATIVE_HEADER_HEIGHT,
} from '@/components/info/InfoSubScreenHeaderView';

/**
 * 사업자 정보 표시 항목(AU-4). 전자상거래법 제10조 사업자 신원 정보.
 *
 * **사업장 소재지·통신판매업 신고번호·생년월일은 넣지 않는다** — 각각의 근거는 스펙에 있다.
 * 통신판매업 신고를 하면 영업소 소재지가 표시 의무가 되므로 그때 주소 항목을 추가한다.
 */
const BUSINESS_INFO: { label: string; value: string }[] = [
  { label: '상호', value: '마그마' },
  { label: '대표자', value: '장하림' },
  { label: '사업자등록번호', value: '167-58-00828' },
  { label: '이메일', value: 'doublejbs@naver.com' },
];

// 라벨 컬럼 고정 폭(목업 §9) — 값의 왼쪽 선이 모든 행에서 같아야 표로 읽힌다.
const LABEL_WIDTH = 96;

const InfoBusinessView: FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Layout
      edges={IS_IOS ? IOS_EDGES : undefined}
      background={<LiquidBackdrop screen='none' glowPosition='topRight' />}
    >
      <InfoSubScreenHeaderView title='사업자 정보' />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          // iOS는 투명 네이티브 헤더가 상단을 덮으므로 그만큼 내려서 시작한다(LG-1).
          IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 그림자는 껍데기가 든다 — 안쪽에서 모서리를 깎으므로(overflow) 같은 뷰에 그림자를
            걸면 자기 경계에서 잘린다(장비 상세 스펙 표와 같은 구조). */}
        <View style={styles.cardShell}>
          <View style={styles.cardClip}>
            {BUSINESS_INFO.map(({ label, value }, index) => (
              <View key={label}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.row}>
                  <PretendardText style={styles.label}>{label}</PretendardText>
                  <PretendardText
                    weight='medium'
                    style={styles.value}
                    selectable
                  >
                    {value}
                  </PretendardText>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  cardShell: {
    borderRadius: LiquidRadius.card,
    boxShadow: LiquidShadow.card,
  },
  cardClip: {
    borderRadius: LiquidRadius.card,
    overflow: 'hidden',
    backgroundColor: Liquid.surface,
    paddingHorizontal: LiquidLayout.cardPad,
    // 첫 행·마지막 행이 모서리에 붙지 않을 정도만 — 행 자체가 세로 여백을 갖는다.
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 13,
  },
  // 카드 안쪽 여백을 그대로 가로지른다 — 라벨 컬럼이 이미 왼쪽 선을 만들어, 목록 행처럼
  // 구분선을 들여쓰면 표가 두 덩어리로 갈려 보인다(장비 상세 스펙 표와 같은 판단).
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
  },
  label: {
    width: LABEL_WIDTH,
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkMuted,
  },
  value: {
    flex: 1,
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.ink,
  },
});

export default InfoBusinessView;
