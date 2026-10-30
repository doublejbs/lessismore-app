import { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  disabled: boolean;
  onSelect: (text: string) => void;
}

// 제안 칩 문구 키(AS-3) — 누르면 문장을 그대로 보낸다.
const SUGGESTION_KEYS = [
  'assistant.suggestion.nextWeekendJirisan',
  'assistant.suggestion.beginner',
  'assistant.suggestion.nearbyWild',
  'assistant.suggestion.traverse',
];

const CHIP_MIN_HEIGHT = 48;

// 빈 대화의 제안 칩(AS-3) — 가로 스크롤, 최소 높이 48.
const AssistantSuggestionChipsView: FC<Props> = ({ disabled, onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps='handled'
    >
      {SUGGESTION_KEYS.map(key => {
        const text = app.getL10n().t(key);

        return (
          <TouchableOpacity
            key={key}
            style={[styles.chip, disabled && styles.chipDisabled]}
            onPress={() => onSelect(text)}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityState={{ disabled }}
          >
            <PretendardText weight='medium' style={styles.label}>
              {text}
            </PretendardText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 12,
    gap: AcgLayout.chipGap,
  },
  chip: {
    minHeight: CHIP_MIN_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.controlFill,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(AssistantSuggestionChipsView);
