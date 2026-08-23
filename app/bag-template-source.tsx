import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BagTemplate from '@/model/bag/BagTemplate';
import app from '@/model/app/App';
import BagTemplateItemView from '@/components/bag/BagTemplateItemView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';

// BAG-2 템플릿 선택 시트. 원본 배낭 선택(BAG-5)과 같은 replace 흐름을 사용한다.
const BagTemplateSourceScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [templates, setTemplates] = useState<BagTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    setLoading(true);

    try {
      setTemplates(await app.getBagTemplateStore()!.getList());
    } catch (error) {
      console.error('템플릿 선택 목록 조회 중 오류 발생:', error); // l10n-ignore: 개발자 로그
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTemplates();
    }, [loadTemplates])
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}
      stickyHeaderIndices={[0]}
      showsVerticalScrollIndicator={false}
    >
      <PretendardText style={styles.title} weight='bold'>
        {app.getL10n().t('app.templateSource.title')}
      </PretendardText>
      {loading ? (
        <ActivityIndicator color={Acg.ink} style={styles.loading} />
      ) : templates.length === 0 ? (
        <View style={styles.empty}>
          <PretendardText style={styles.emptyText}>
            {app.getL10n().t('app.templateSource.empty')}
          </PretendardText>
        </View>
      ) : (
        <View>
          {templates.map((template, index) => (
            <BagTemplateItemView
              key={template.getID()}
              template={template}
              onDelete={() => undefined}
              divided={index > 0}
              showMenuButton={false}
              onPress={() =>
                router.replace({
                  pathname: '/bag-template-create',
                  params: { templateId: template.getID() },
                })
              }
            />
          ))}
        </View>
      )}
      <View style={styles.bottomInset} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  content: {
    paddingTop: 20,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: 20,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
    backgroundColor: Acg.paper,
    paddingVertical: 12,
    marginBottom: 16,
  },
  loading: {
    marginTop: 24,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  bottomInset: {
    height: 32,
  },
});

export default BagTemplateSourceScreen;
