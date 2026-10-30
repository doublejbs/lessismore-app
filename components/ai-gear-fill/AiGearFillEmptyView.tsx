import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import SecondaryPillButtonView from '@/components/ui/SecondaryPillButtonView';

interface Props {
  onSearch: () => void;
}

// 결과 0개(AS-15) — 담긴 그룹이 많아 고를 게 없을 때. 검색 모달(이 배낭 컨텍스트)로 교체한다.
const AiGearFillEmptyView: FC<Props> = ({ onSearch }) => {
  const l10n = app.getL10n();

  return (
    <View style={styles.container}>
      <PretendardText style={styles.message}>
        {l10n.t('aiGearFill.empty')}
      </PretendardText>
      <SecondaryPillButtonView
        label={l10n.t('aiGearFill.searchAdd')}
        onPress={onSearch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 64,
  },
  message: {
    ...AcgType.body,
    color: Acg.ink,
    textAlign: 'center',
  },
});

export default AiGearFillEmptyView;
