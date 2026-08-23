import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import BagTemplate from '@/model/bag/BagTemplate';
import BagFormContent from '@/components/bag/BagFormContent';
import { Acg } from '@/constants/DesignTokens';

const BagTemplateCreateScreen = () => {
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const [template, setTemplate] = useState<BagTemplate | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs().add(1, 'day')
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadTemplate = async () => {
      if (!templateId) {
        router.back();

        return;
      }

      try {
        const value = await app.getBagTemplateStore()!.get(templateId);

        if (!value) {
          if (mounted) {
            Alert.alert(app.getL10n().t('common.error'), app.getL10n().t('app.templateCreate.notFound'), [
              { text: app.getL10n().t('common.confirm'), onPress: () => router.back() },
            ]);
          }

          return;
        }

        if (mounted) {
          setTemplate(value);
          setInputValue(value.getName());
        }
      } catch (error) {
        console.error('템플릿 조회 중 오류 발생:', error); // l10n-ignore: 개발자 로그
        if (mounted) {
          Alert.alert(app.getL10n().t('common.error'), app.getL10n().t('app.templateCreate.loadFailed'), [
            { text: app.getL10n().t('common.confirm'), onPress: () => router.back() },
          ]);
        }
      }
    };

    void loadTemplate();

    return () => {
      mounted = false;
    };
  }, [router, templateId]);

  const handleConfirm = async () => {
    if (creating || !template) {
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert(app.getL10n().t('common.error'), app.getL10n().t('app.bagForm.dateRequired'));

      return;
    }

    const name = inputValue.trim();

    if (!name.length) {
      Alert.alert(app.getL10n().t('app.bagForm.nameRequired'));

      return;
    }

    setCreating(true);

    try {
      const bagID = await app
        .getBagTemplateStore()!
        .createBag(template, name, startDate, endDate);

      app.getToastManager()?.show({ message: app.getL10n().t('app.templateCreate.completed') });
      router.replace(`/bag/${bagID}`);
    } catch (error) {
      console.error('템플릿에서 배낭 생성 중 오류 발생:', error); // l10n-ignore: 개발자 로그
      Alert.alert(
        app.getL10n().t('common.error'),
        app.getL10n().t('app.templateCreate.failed')
      );
    } finally {
      setCreating(false);
    }
  };

  if (!template) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Acg.paper,
        }}
      >
        <ActivityIndicator color={Acg.ink} />
      </View>
    );
  }

  return (
    <BagFormContent
      title={app.getL10n().t('app.templateCreate.title')}
      inputValue={inputValue}
      startDate={startDate}
      endDate={endDate}
      confirmText={app.getL10n().t('app.templateCreate.confirm')}
      disabled={creating}
      onChangeName={setInputValue}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onConfirm={handleConfirm}
      onCancel={() => router.back()}
    />
  );
};

export default BagTemplateCreateScreen;
