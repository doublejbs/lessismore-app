import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import SecondaryPillButtonView from '@/components/ui/SecondaryPillButtonView';

interface Props {
  warehouseEmpty: boolean;
  onSearch: () => void;
}

// 결과 0개(AS-15) — 창고가 비었거나(`warehouseEmpty`, 모델 미호출), 담긴 그룹이 많아 고를 게 없을 때.
// 둘 다 검색 모달(이 배낭 컨텍스트)로 교체한다. 빈 상태에는 `다시 추천`을 두지 않는다.
const AiGearFillEmptyView: FC<Props> = ({ warehouseEmpty, onSearch }) => {
  const l10n = app.getL10n();

  return (
    <View style={styles.container}>
      <PretendardText style={styles.message}>
        {l10n.t(
          warehouseEmpty ? 'aiGearFill.emptyWarehouse' : 'aiGearFill.empty'
        )}
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
