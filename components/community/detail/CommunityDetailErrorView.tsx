import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  onRetry: () => void;
}

const CommunityDetailErrorView: FC<Props> = ({ onRetry }) => {
  return (
    <View style={styles.container}>
      <PretendardText weight='semibold' style={styles.title}>
        {app.getL10n().t('community.detail.failed')}
      </PretendardText>
      <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole='button'>
        <PretendardText weight='semibold' style={styles.buttonText}>
          {app.getL10n().t('community.detail.retry')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { ...AcgType.sectionTitle, color: Acg.ink, textAlign: 'center' },
  button: { minHeight: 44, marginTop: 20, paddingHorizontal: 24, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Acg.ink },
  buttonText: { ...AcgType.control, color: Acg.paper },
});

export default CommunityDetailErrorView;
