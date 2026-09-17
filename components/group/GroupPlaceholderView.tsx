import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import app from '@/model/app/App';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';

/**
 * 그룹 화면 자리표시(GRP §2 화면 트리).
 *
 * 라우트 골격을 먼저 등록해 두려고 둔 최소 화면이다 — 후속 작업이 각 라우트 본문을
 * 실제 화면으로 교체하면 이 컴포넌트는 쓰이지 않는다.
 */
const GroupPlaceholderView: FC = () => {
  return (
    <Layout paddingHorizontal={AcgLayout.screenPadding}>
      <View style={styles.container}>
        <PretendardText weight='semibold' style={styles.text}>
          {app.getL10n().t('group.common.preparing')}
        </PretendardText>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
    textAlign: 'center',
  },
});

export default GroupPlaceholderView;
