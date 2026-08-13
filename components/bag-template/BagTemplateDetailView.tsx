import { FC, useCallback } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import BagTemplateDetail from '@/model/bag-template/BagTemplateDetail';
import BagTemplateNameView from './BagTemplateNameView';
import BagTemplateCategoryView from './BagTemplateCategoryView';
import BagTemplateBottomBar from './BagTemplateBottomBar';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';

interface Props {
  detail: BagTemplateDetail;
}

const IS_IOS = Platform.OS === 'ios';
const SAFE_AREA_EDGES: readonly Edge[] = IS_IOS
  ? ['left', 'right', 'bottom']
  : ['top', 'left', 'right', 'bottom'];

const BagTemplateDetailView: FC<Props> = ({ detail }) => {
  useFocusEffect(
    useCallback(() => {
      void detail.initialize();
    }, [detail])
  );

  const stackScreen = (
    <Stack.Screen
      options={{
        headerShown: IS_IOS,
        headerTransparent: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    />
  );

  if (!detail.isInitialized()) {
    return stackScreen;
  }

  if (detail.isMissing()) {
    return <MissingTemplateView detail={detail} stackScreen={stackScreen} />;
  }

  const categories = detail.getGearsByCategory();

  return (
    <View style={styles.root}>
      {stackScreen}
      <SafeAreaView
        style={styles.root}
        edges={SAFE_AREA_EDGES}
      >
        {!IS_IOS && (
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => detail.back()}
              style={styles.backButton}
              accessibilityRole='button'
              accessibilityLabel='뒤로가기'
            >
              <Ionicons name='chevron-back' size={24} color={Acg.ink} />
            </TouchableOpacity>
          </View>
        )}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          // iOS 투명 네이티브 헤더 아래로 첫 콘텐츠가 가려지지 않도록 자동 인셋을 적용한다.
          // Android/Web은 커스텀 헤더가 SafeAreaView 안에서 별도로 공간을 차지한다.
          contentInsetAdjustmentBehavior='automatic'
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.identity}>
            <BagTemplateNameView detail={detail} />
            <View style={styles.weightBlock}>
              <PretendardText style={styles.weightLabel}>총 무게</PretendardText>
              <AcgDisplayText style={styles.weight}>
                {`${detail.getWeight()}kg`}
              </AcgDisplayText>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.gearSection}>
            <AcgSectionHeaderView title={`장비 ${detail.getCount()}개`} />
            <View style={styles.gearList}>
              {categories.map(({ category, gears }) => (
                <BagTemplateCategoryView
                  key={category.getFilter()}
                  category={category}
                  gears={gears}
                  detail={detail}
                />
              ))}
            </View>
          </View>
        </ScrollView>
        <BagTemplateBottomBar detail={detail} />
      </SafeAreaView>
    </View>
  );
};

interface MissingProps {
  detail: BagTemplateDetail;
  stackScreen: React.ReactNode;
}

const MissingTemplateView: FC<MissingProps> = ({ detail, stackScreen }) => {
  useFocusEffect(
    useCallback(() => {
      Alert.alert('오류', '템플릿을 찾을 수 없습니다.', [
        { text: '확인', onPress: () => detail.back() },
      ]);
    }, [detail])
  );

  return <>{stackScreen}</>;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  header: {
    minHeight: 44,
    paddingHorizontal: AcgLayout.screenPadding,
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  identity: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 8,
    gap: 20,
  },
  weightBlock: {
    gap: 2,
  },
  weightLabel: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  weight: {
    ...AcgType.displayLarge,
    color: Acg.ink,
  },
  separator: {
    minHeight: 12,
  },
  gearSection: {
    paddingHorizontal: AcgLayout.screenPadding,
  },
  gearList: {
    gap: 20,
    paddingBottom: 20,
  },
});

export default observer(BagTemplateDetailView);
