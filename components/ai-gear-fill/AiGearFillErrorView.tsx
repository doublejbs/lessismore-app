import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AiGearFillErrorKind from '@/model/ai-gear-fill/AiGearFillErrorKind';
import SecondaryPillButtonView from '@/components/ui/SecondaryPillButtonView';

interface Props {
  kind: AiGearFillErrorKind;
  onRetry: () => void;
  onSearch: () => void;
}

const MESSAGE_KEYS: Record<AiGearFillErrorKind, string> = {
  [AiGearFillErrorKind.Network]: 'aiGearFill.errorNetwork',
  [AiGearFillErrorKind.Limit]: 'aiGearFill.errorLimit',
  [AiGearFillErrorKind.Refused]: 'aiGearFill.errorRefused',
  [AiGearFillErrorKind.Generic]: 'aiGearFill.errorGeneric',
  [AiGearFillErrorKind.Offline]: 'aiGearFill.errorOffline',
};

// 에러(AS-8) — 결과 자리에 문구 + 버튼. 한도·오프라인은 버튼이 없고, 거절은 `검색으로 추가`.
const AiGearFillErrorView: FC<Props> = ({ kind, onRetry, onSearch }) => {
  const l10n = app.getL10n();

  const renderAction = () => {
    if (
      kind === AiGearFillErrorKind.Limit ||
      kind === AiGearFillErrorKind.Offline
    ) {
      return null;
    }

    if (kind === AiGearFillErrorKind.Refused) {
      return (
        <SecondaryPillButtonView
          label={l10n.t('aiGearFill.searchAdd')}
          onPress={onSearch}
        />
      );
    }

    return (
      <SecondaryPillButtonView
        label={l10n.t('aiGearFill.errorRetry')}
        onPress={onRetry}
      />
    );
  };

  return (
    <View style={styles.container}>
      <PretendardText style={styles.message} accessibilityRole='alert'>
        {l10n.t(MESSAGE_KEYS[kind])}
      </PretendardText>
      {renderAction()}
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

export default AiGearFillErrorView;
