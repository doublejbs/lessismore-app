import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import ExploreWarehouse from '@/model/explore/ExploreWarehouse';
import ExploreView from '@/components/explore/ExploreView';
import Bag from '@/model/bag/Bag';
import LogInView from '@/components/login/LogInView';
import AlertView from '@/components/alert/AlertView';
import ToastView from '@/components/toast/ToastView';
import app from '@/model/app/App';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ExplorePage = () => {
  const router = useRouter();
  const [exploreWarehouse] = useState(() => ExploreWarehouse.new(router));
  const [bag] = useState(() => Bag.new());

  return (
    <>
      <Stack.Screen
        options={{
          title: '전체 장비 탐색',
          headerShown: true,
          headerBackTitle: '',
          headerTintColor: '#000',
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: 'Pretendard-Bold',
            fontSize: 16,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name='chevron-back' size={24} color='black' />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <ExploreView exploreWarehouse={exploreWarehouse} bag={bag} />
      </View>
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
});

export default observer(ExplorePage);
