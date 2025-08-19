import LogInScreenView from '@/components/login/LogInScreenView';
import app from '@/model/app/App';
import { SafeAreaView, Pressable } from 'react-native';
import { router } from 'expo-router';

const LogInPage = () => {
  const handleDimPress = () => {
    router.back();
  };

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

export default LogInPage;
