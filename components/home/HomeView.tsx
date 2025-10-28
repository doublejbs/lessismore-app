import Layout from '@/components/Layout';
import { View, Text, Image, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import { StyleSheet } from 'react-native';
import Home from '@/model/home/Home';
import { useEffect, useState } from 'react';

const HomeView = () => {
  const [home] = useState(() => Home.new());

  useEffect(() => {
    home.initialize();
  }, [home]);

  return (
    <Layout>
      <View style={styles.titleContainer}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={{ width: '100%', height: 32 }}
          resizeMode='contain'
        />
      </View>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.mainTitle}>
              {home.getNickname()}님의 다가오는 일정
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>장비 후기를 남겨보세요</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>실시간 인기 장비 순위</Text>
            <View style={styles.gearList}>
              <View style={styles.gearItem}>
                <View style={styles.gearImage} />
                <View style={styles.gearInfo}>
                  <Text style={styles.gearName}>카퍼 스퍼 HV UL2</Text>
                  <View style={styles.gearWeight}>
                    <Text style={styles.weightText}>1.2</Text>
                    <Text style={styles.weightText}>kg</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {},
  mainTitle: {
    fontWeight: '900',
    fontSize: 20,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 20,
  },
  gearList: {
    gap: 8,
  },
  gearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  gearImage: {
    width: 72,
    height: 72,
    backgroundColor: '#F4F0F0',
    borderRadius: 4,
  },
  gearInfo: {
    flex: 1,
    flexDirection: 'column',
    gap: 10,
  },
  gearName: {
    fontFamily: 'Pretendard',
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: -0.8,
    color: '#242424',
  },
  gearWeight: {
    flexDirection: 'row',
    gap: 1,
  },
  weightText: {
    fontFamily: 'Pretendard',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: -0.7,
    color: '#000000',
  },
});

export default observer(HomeView);
