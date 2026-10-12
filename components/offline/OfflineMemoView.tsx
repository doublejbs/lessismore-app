import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  memo: string;
}

/**
 * 오프라인 상세의 메모 (OF-5). 액션 그리드에는 `코스`·`여행지`·`오프라인`만 남기므로 메모는 누를 수
 * 없는 읽기 전용 면으로 그 아래에 둔다(오프라인에서는 메모를 고칠 수 없다 — §8 후속).
 */
const OfflineMemoView: FC<Props> = ({ memo }) => {
  return (
    <View style={styles.container} accessible>
      <PretendardText style={styles.title} weight='semibold'>
        {app.getL10n().t('bag.memo.title')}
      </PretendardText>
      <PretendardText style={styles.body}>{memo}</PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 4,
    padding: 14,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  title: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  body: {
    ...AcgType.body,
    color: Acg.ink,
  },
});

export default OfflineMemoView;
