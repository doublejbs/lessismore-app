import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import LoadingView from '@/components/ui/LoadingView';
import LogInView from '@/components/login/LogInView';
import app from '@/model/app/App';
import CommunityMyPosts from '@/model/community-my-posts/CommunityMyPosts';
import CommunityMyPostsDispatcher from '@/model/community-my-posts/CommunityMyPostsDispatcher';
import CommunityMyPostsView from './CommunityMyPostsView';

const CommunityMyPostsWrapper = () => {
  const router = useRouter();
  const [myPosts] = useState(() =>
    CommunityMyPosts.from(CommunityMyPostsDispatcher.new())
  );
  const userId = app.getFirebase().getUserId();
  const loginAlertManager = app.getLogInAlertManager();
  const isLoginVisible = loginAlertManager?.isVisible() ?? false;
  const loginPrompted = useRef(false);

  useEffect(() => {
    if (!userId) {
      if (!loginPrompted.current) {
        loginPrompted.current = true;
        loginAlertManager?.show();

        return;
      }

      if (!isLoginVisible) {
        router.back();
      }

      return;
    }

    void myPosts.initialize();
  }, [isLoginVisible, loginAlertManager, myPosts, router, userId]);

  useEffect(() => {
    return () => {
      myPosts.dispose();
    };
  }, [myPosts]);

  if (!userId) {
    return (
      <View style={styles.loading}>
        <LoadingView />
        {loginAlertManager ? (
          <LogInView logInAlertManager={loginAlertManager} />
        ) : null}
      </View>
    );
  }

  return <CommunityMyPostsView myPosts={myPosts} />;
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
  },
});

export default observer(CommunityMyPostsWrapper);
