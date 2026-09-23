import { FC } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color } from '@/constants/DesignTokens';
import tileStyles from './BagDetailActionTileStyles';

interface Props {
  bagDetail: BagDetail;
}

const BagDetailMemoView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();
  const hasMemo = bagDetail.hasMemo();
  const memo = bagDetail.getMemo();

  const handlePressMemo = () => {
    app.getAnalyticsManager()?.logClick('bag_memo');
    router.push(`/bag/${bagDetail.getId()}/memo`);
  };

  return (
    <TouchableOpacity
      style={tileStyles.tile}
      onPress={handlePressMemo}
      activeOpacity={0.7}
    >
      <Ionicons
        name='document-text-outline'
        size={22}
        color={Color.textPrimary}
      />
      {hasMemo ? (
        // 메모가 있으면 '메모' 라벨을 빼고 내용에 공간을 다 준다(아이콘으로 메모임을 식별).
        // 옆 타일의 주 텍스트(라벨 15pt medium)와 위계를 맞춘다.
        <PretendardText
          style={styles.memoContent}
          weight='medium'
          numberOfLines={3}
        >
          {memo}
        </PretendardText>
      ) : (
        <View style={tileStyles.textWrap}>
          <PretendardText style={tileStyles.title} weight='medium'>
            {app.getL10n().t('bag.memo.title')}
          </PretendardText>
          <PretendardText style={tileStyles.subtitle} numberOfLines={1}>
            {app.getL10n().t('bag.memo.write')}
          </PretendardText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  memoContent: {
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
});

export default observer(BagDetailMemoView);
