import { FC, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';
import app from '@/model/app/App';
import PretendardText from '../PretendardText';

const AddButtonView: FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (showMenu) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMenu, fadeAnim, slideAnim]);

  const handleClick = () => {
    setShowMenu(true);
  };

  const handlePressBack = () => {
    setShowMenu(false);
  };

  const handleClickSearch = () => {
    setShowMenu(false);

    if (app.getFirebase().isLoggedIn()) {
      router.push('/search');
    } else {
      router.push('/not-login-search');
    }
  };

  const handleClickCustom = () => {
    setShowMenu(false);
    if (app.getFirebase().isLoggedIn()) {
      router.push('/custom');
    } else {
      app.getLogInAlertManager()?.show();
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.addButton} onPress={handleClick}>
        <PretendardText style={styles.addButtonText}>장비 추가</PretendardText>
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent={true}
        animationType='none'
        onRequestClose={handlePressBack}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={handlePressBack}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.menuSection}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleClickSearch}
              >
                <Svg width={16} height={16} viewBox='0 0 16 16' fill='none'>
                  <Path
                    d='M10.9167 9.66667H10.2583L10.025 9.44167C10.8417 8.49167 11.3333 7.25833 11.3333 5.91667C11.3333 2.925 8.90833 0.5 5.91667 0.5C2.925 0.5 0.5 2.925 0.5 5.91667C0.5 8.90833 2.925 11.3333 5.91667 11.3333C7.25833 11.3333 8.49167 10.8417 9.44167 10.025L9.66667 10.2583V10.9167L13.8333 15.075L15.075 13.8333L10.9167 9.66667ZM5.91667 9.66667C3.84167 9.66667 2.16667 7.99167 2.16667 5.91667C2.16667 3.84167 3.84167 2.16667 5.91667 2.16667C7.99167 2.16667 9.66667 3.84167 9.66667 5.91667C9.66667 7.99167 7.99167 9.66667 5.91667 9.66667Z'
                    fill='black'
                  />
                </Svg>
                <Text style={styles.menuItemText}>검색으로 추가하기</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleClickCustom}
              >
                <Svg width={20} height={20} viewBox='0 0 20 20' fill='none'>
                  <G clipPath='url(#clip0_387_8814)'>
                    <Path
                      d='M2.5 14.3751V17.5001H5.625L14.8417 8.28346L11.7167 5.15846L2.5 14.3751ZM17.2583 5.8668C17.5833 5.5418 17.5833 5.0168 17.2583 4.6918L15.3083 2.7418C14.9833 2.4168 14.4583 2.4168 14.1333 2.7418L12.6083 4.2668L15.7333 7.3918L17.2583 5.8668Z'
                      fill='black'
                    />
                  </G>
                  <Defs>
                    <ClipPath id='clip0_387_8814'>
                      <Rect width='20' height='20' fill='white' />
                    </ClipPath>
                  </Defs>
                </Svg>
                <Text style={styles.menuItemText}>직접 작성하기</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.closeSection}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handlePressBack}
              >
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
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
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'black',
    height: 48,
    backgroundColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: 127,
    gap: 6,
  },
  addButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
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
