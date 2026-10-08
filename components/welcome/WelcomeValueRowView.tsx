import { FC, ComponentProps } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
}

const ICON_TILE_SIZE = 40;

// 환영 화면 가치 한 행(OB-14) — 아이콘 타일(연회색 면, 모서리 12) + 이름 + 보조 한 줄. 목록이 아니라 소개라 헤어라인 없음.
const WelcomeValueRowView: FC<Props> = ({ icon, title, subtitle }) => {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${title}, ${subtitle}`}
    >
      <View style={styles.iconTile}>
        <Ionicons name={icon} size={22} color={Acg.ink} />
      </View>
      <View style={styles.text}>
        <PretendardText weight='medium' style={styles.title}>
          {title}
        </PretendardText>
        <PretendardText style={styles.subtitle}>{subtitle}</PretendardText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconTile: {
    width: ICON_TILE_SIZE,
    height: ICON_TILE_SIZE,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  subtitle: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
});

export default WelcomeValueRowView;
