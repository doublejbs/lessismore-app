import { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import FloatingPillButton from '@/components/FloatingPillButton';

const AddButtonView: FC = () => {
  const router = useRouter();

  const handleClick = () => {
    app.getAnalyticsManager()?.logClick('gear_add');

    if (app.getFirebase().isLoggedIn()) {
      router.push('/custom');
    } else {
      app.getLogInAlertManager()?.show();
    }
  };

  return (
    <View>
      <FloatingPillButton
        label='장비 추가'
        onPress={handleClick}
        variant='primary'
        style={styles.addButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  addButton: {
    position: 'absolute',
    right: 0,
    bottom: Platform.select({
      ios: 80,
      android: 0,
      default: 80,
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    height: 229,
  },
  menuSection: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 10,
  },
  menuItemText: {
    fontSize: 16,
    lineHeight: 18,
    color: 'black',
  },
  closeSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  closeButton: {
    width: '100%',
    backgroundColor: 'black',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddButtonView;
