import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailAddButtonView: FC<Props> = ({ bagDetail }) => {
  const handlePressAdd = () => {
    app.getAnalyticsManager()?.logClick('bag_edit');
    bagDetail.goToEdit();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePressAdd}>
        <PretendardText style={styles.buttonText} weight='semibold'>
          수정하기
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: Spacing.screenH,
    backgroundColor: Color.background,
  },
  button: {
    backgroundColor: Color.textPrimary,
    width: '100%',
    padding: 14,
    borderRadius: Radius.card,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default BagDetailAddButtonView;
