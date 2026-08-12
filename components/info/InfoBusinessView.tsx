import { FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
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

const InfoBusinessView: FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Layout edges={IS_IOS ? IOS_EDGES : undefined}>
      <InfoSubScreenHeaderView title='사업자 정보' />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          // iOS는 투명 네이티브 헤더가 상단을 덮으므로 그만큼 내려서 시작한다(LG-1).
          IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 정보 표라 종이 면 위에 올린다(ACG) — 지면 위에 표만 떠 있으면 측량 마크·
            라임 트레일이 행 사이를 지나가 산만하다(2026-08-04 시뮬레이터 확인). */}
        <View style={styles.paper}>
          {BUSINESS_INFO.map(({ label, value }, index) => (
            <View
              key={label}
              style={[styles.row, index > 0 && styles.rowDivider]}
            >
              <PretendardText style={styles.label}>{label}</PretendardText>
              <PretendardText style={styles.value} selectable>
                {value}
              </PretendardText>
            </View>
          ))}
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
  paper: {
    paddingHorizontal: 16,
    backgroundColor: Acg.controlFill,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  // 라벨 폭을 고정해 값의 시작 위치를 세로로 맞춘다.
  label: {
    width: 110,
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  value: {
    flex: 1,
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
});

export default InfoBusinessView;
