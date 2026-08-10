import { FC } from 'react';
import { StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import BagDetailTileView from './BagDetailTileView';
import { Liquid } from '@/constants/DesignTokens';

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

  // 메모가 있으면 '메모' 라벨을 빼고 내용에 공간을 다 준다(아이콘으로 메모임을 식별) —
  // 목업 §6의 메모 타일도 라벨 없이 내용 한 덩어리다.
  if (hasMemo) {
    return (
      <BagDetailTileView
        icon='document-text-outline'
        onPress={handlePressMemo}
        accessibilityLabel={`메모 ${memo}`}
      >
        <PretendardText
          weight='medium'
          style={styles.memoContent}
          numberOfLines={3}
        >
          {memo}
        </PretendardText>
      </BagDetailTileView>
    );
  }

  return (
    <BagDetailTileView
      icon='document-text-outline'
      title='메모'
      subtitle='작성하기'
      onPress={handlePressMemo}
      accessibilityLabel='메모 작성하기'
    />
  );
};

const styles = StyleSheet.create({
  memoContent: {
    fontSize: 14,
    lineHeight: 20,
    color: Liquid.ink,
  },
});

export default observer(BagDetailMemoView);
