import { FC, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';
import app from '@/model/app/App';

const AddButtonView: FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setShowMenu(!showMenu);
  };

  if (showMenu) {
    const handleClickSearch = () => {
      router.push('/search');
    };

    const handleClickCustom = () => {
      if (app.getFirebase().isLoggedIn()) {
        router.push('/warehouse/custom');
      } else {
        app.getLogInAlertManager()?.show();
      }
    };

    return (
      <View style={styles.overlay}>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuButton} onPress={handleClickSearch}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path
                d="M10.9167 9.66667H10.2583L10.025 9.44167C10.8417 8.49167 11.3333 7.25833 11.3333 5.91667C11.3333 2.925 8.90833 0.5 5.91667 0.5C2.925 0.5 0.5 2.925 0.5 5.91667C0.5 8.90833 2.925 11.3333 5.91667 11.3333C7.25833 11.3333 8.49167 10.8417 9.44167 10.025L9.66667 10.2583V10.9167L13.8333 15.075L15.075 13.8333L10.9167 9.66667ZM5.91667 9.66667C3.84167 9.66667 2.16667 7.99167 2.16667 5.91667C2.16667 3.84167 3.84167 2.16667 5.91667 2.16667C7.99167 2.16667 9.66667 3.84167 9.66667 5.91667C9.66667 7.99167 7.99167 9.66667 5.91667 9.66667Z"
                fill="black"
              />
            </Svg>
            <Text style={styles.menuButtonText}>검색으로 추가하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={handleClickCustom}>
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <G clipPath="url(#clip0_387_8814)">
                <Path
                  d="M2.5 14.3751V17.5001H5.625L14.8417 8.28346L11.7167 5.15846L2.5 14.3751ZM17.2583 5.8668C17.5833 5.5418 17.5833 5.0168 17.2583 4.6918L15.3083 2.7418C14.9833 2.4168 14.4583 2.4168 14.1333 2.7418L12.6083 4.2668L15.7333 7.3918L17.2583 5.8668Z"
                  fill="black"
                />
              </G>
              <Defs>
                <ClipPath id="clip0_387_8814">
                  <Rect width="20" height="20" fill="white" />
                </ClipPath>
              </Defs>
            </Svg>
            <Text style={styles.menuButtonText}>직접 작성하기</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleClick}>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path
              d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"
              fill="black"
            />
          </Svg>
        </TouchableOpacity>
      </View>
    );
  } else {
    return (
      <TouchableOpacity style={styles.addButton} onPress={handleClick}>
        <Text style={styles.addButtonText}>장비 추가</Text>
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  menuContainer: {
    width: 200,
    height: 104,
    position: 'absolute',
    right: 20,
    backgroundColor: 'white',
    bottom: 156,
    borderRadius: 12,
    paddingVertical: 8,
  },
  menuButton: {
    padding: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  menuButtonText: {
    fontSize: 14,
    color: 'black',
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: 'white',
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    width: 127,
    height: 48,
    backgroundColor: 'black',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    bottom: 80,
    right: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});

export default AddButtonView;
