import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  onBack: () => void;
}

const CommunityDetailEmptyView: FC<Props> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <PretendardText weight='semibold' style={styles.title}>
        {app.getL10n().t('community.detail.notFound')}
      </PretendardText>
      <TouchableOpacity style={styles.button} onPress={onBack} accessibilityRole='button'>
        <PretendardText weight='semibold' style={styles.buttonText}>
          {app.getL10n().t('community.detail.back')}
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

export default CommunityDetailEmptyView;
