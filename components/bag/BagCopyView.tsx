import React, { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import BagItem from '@/model/bag/BagItem';
import app from '@/model/app/App';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  bagItem: BagItem;
}

// 배낭 목록 행의 복사 버튼 → 네이티브 복사 폼(formSheet 라우트).
const BagCopyView: FC<Props> = ({ bagItem }) => {
  const router = useRouter();

  const showCopy = () => {
    if (!app.getFirebase()?.isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    router.push({
      pathname: '/bag-copy',
      params: {
        sourceId: bagItem.getID(),
        sourceName: bagItem.getName(),
        entrySource: 'list',
      },
    });
  };

  return (
    <TouchableOpacity
      style={styles.copyButton}
      onPress={showCopy}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <IconSymbol name='doc.on.doc' size={18} color={Color.textTertiary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  copyButton: {
    height: 32,
    width: 32,
    padding: 4,
    backgroundColor: Color.thumbBg,
    borderRadius: Radius.listThumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BagCopyView;
