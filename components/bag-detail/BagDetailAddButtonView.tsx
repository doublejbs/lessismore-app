import { FC } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';

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
        <Text style={styles.buttonText}>수정하기</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: 'black',
    width: '100%',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default BagDetailAddButtonView;
