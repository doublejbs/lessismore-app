import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import LoadingView from '@/components/ui/LoadingView';
import app from '@/model/app/App';
import CommunityPostType from '@/model/community/CommunityPostType';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import CommunityWriteDispatcher from '@/model/community-write/CommunityWriteDispatcher';
import CommunityWriteMode from '@/model/community-write/CommunityWriteMode';
import CommunityWriteView from './CommunityWriteView';

interface Props {
  mode: CommunityWriteMode;
  type?: CommunityPostType;
  postId?: string;
}

/**
 * 커뮤니티 글쓰기 화면의 상태 수명과 초기 로드를 담당한다(CM-2, CM-3, CM-4, CM-5, CM-6, CM-9).
 * 이미지 세션은 공개 커뮤니티 경로를 사용하며 개인 장비 사진 상태와 분리된다.
 */
const CommunityWriteWrapper = ({ mode, type, postId }: Props) => {
  const router = useRouter();
  const [write] = useState(() =>
    mode === CommunityWriteMode.Edit && postId
      ? CommunityWrite.edit(postId, CommunityWriteDispatcher.new())
      : CommunityWrite.create(
          type ?? CommunityPostType.Question,
          CommunityWriteDispatcher.new()
        )
  );

  useEffect(() => {
    if (type) {
      write.updateTypeIfEmpty(type);
    }
  }, [type, write]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      if (!app.getFirebase().isLoggedIn()) {
        app.getLogInAlertManager()?.show();
        router.back();

        return;
      }

      let authorized = false;

      try {
        authorized = await write.initialize();
      } catch {
        app.getToastManager()?.show({
          message: app.getL10n().t('community.write.failed'),
        });
      }

      if (active && !authorized) {
        router.back();
      }
    };

    void initialize();

    return () => {
      active = false;
    };
  }, [router, write]);

  if (!write.isInitialized()) {
    return (
      <View style={styles.loading}>
        <LoadingView />
      </View>
    );
  }

  return <CommunityWriteView write={write} />;
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
  },
});

export default observer(CommunityWriteWrapper);
