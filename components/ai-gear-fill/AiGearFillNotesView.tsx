import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  notes: string[];
}

// 참고(AS-14): 장비로 담을 수 없는 것(물·식량·예약). 연회색 면 + 모서리 12 안에 `·` 줄로.
const AiGearFillNotesView: FC<Props> = ({ notes }) => {
  if (notes.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${app.getL10n().t('aiGearFill.notesAccessibility')}. ${notes.join('. ')}`}
    >
      {notes.map((note, index) => (
        <View key={`${index}-${note}`} style={styles.line}>
          <PretendardText style={styles.text}>·</PretendardText>
          <PretendardText style={[styles.text, styles.note]}>
            {note}
          </PretendardText>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
    padding: 16,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  line: {
    flexDirection: 'row',
    gap: 6,
  },
  text: {
    ...AcgType.body,
    color: Acg.ink,
  },
  note: {
    flex: 1,
  },
});

export default AiGearFillNotesView;
