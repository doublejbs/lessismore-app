import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgFontSize } from '@/constants/DesignTokens';

interface Props {
  title: string;
  /**
   * 제목 아래 회색 한 줄. **무엇을 기준으로 고른 목록인지**를 적는다(레퍼런스: `Top trails
   * near Seongnam`). 같은 말을 크기만 줄여 반복하는 부제는 두지 않는다 — 줄만 늘어난다.
   */
  subtitle?: string | undefined;
}

/**
 * 목록 섹션 머리(레퍼런스 이식 2026-08-11).
 *
 * 제목을 작게 두던 앞선 판단을 뒤집었다 — 레퍼런스는 섹션 제목을 본문보다 분명히 크게 두고
 * 그 아래 회색 부제로 목록의 기준을 밝힌다. 훑을 때 "여기부터 무엇"이 먼저 잡혀야 한다.
 */
const AcgSectionHeaderView: FC<Props> = ({ title, subtitle }) => {
  return (
    <View style={styles.container}>
      <PretendardText weight='semibold' style={styles.title}>
        {title}
      </PretendardText>
      {subtitle ? (
        <PretendardText style={styles.subtitle}>{subtitle}</PretendardText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    // 제목과 부제는 붙여 둔다(레퍼런스) — 벌리면 부제가 다음 항목의 머리처럼 읽힌다.
    gap: 0,
  },
  // 실측값(제목 20 / 부제 16). 층은 크기가 아니라 굵기로 가른다 — 제목만 semibold다.
  title: {
    fontSize: AcgFontSize.sectionTitle,
    lineHeight: 24,
    color: Acg.ink,
  },
  subtitle: {
    fontSize: AcgFontSize.sectionSubtitle,
    lineHeight: 21,
    color: Acg.textMuted,
  },
});

export default AcgSectionHeaderView;
