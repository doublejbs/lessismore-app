import LogInScreenView from '@/components/login/LogInScreenView';
import app from '@/model/app/App';
import { SafeAreaView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';

const LogInPage = () => {
  const isLoggedIn = app.getFirebase().isLoggedIn();

  const handleDimPress = () => {
    router.back();
  };

  useEffect(() => {
    if (isLoggedIn) {
      router.back();
    }
  }, [isLoggedIn]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Pressable style={{ flex: 1 }} onPress={handleDimPress}>
        <LogInScreenView
          logInAlertManager={app.getLogInAlertManager()!}
          onDimPress={handleDimPress}
        />
      </Pressable>
    </SafeAreaView>
  );
};

export default observer(LogInPage);
