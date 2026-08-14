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
            Alert.alert('오류', '템플릿을 찾을 수 없습니다.', [
              { text: '확인', onPress: () => router.back() },
            ]);
          }

          return;
        }

        if (mounted) {
          setTemplate(value);
          setInputValue(value.getName());
        }
      } catch (error) {
        console.error('템플릿 조회 중 오류 발생:', error);
        if (mounted) {
          Alert.alert('오류', '템플릿을 불러오지 못했습니다.', [
            { text: '확인', onPress: () => router.back() },
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
      Alert.alert('오류', '날짜를 선택해주세요');

      return;
    }

    const name = inputValue.trim();

    if (!name.length) {
      Alert.alert('배낭 이름을 입력해주세요');

      return;
    }

    setCreating(true);

    try {
      const bagID = await app
        .getBagTemplateStore()!
        .createBag(template, name, startDate, endDate);

      app.getToastManager()?.show({ message: '배낭이 만들어졌습니다' });
      router.replace(`/bag/${bagID}`);
    } catch (error) {
      console.error('템플릿에서 배낭 생성 중 오류 발생:', error);
      Alert.alert(
        '오류',
        '배낭 생성 중 문제가 발생했습니다. 다시 시도해주세요.'
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
      title='배낭 만들기'
      inputValue={inputValue}
      startDate={startDate}
      endDate={endDate}
      confirmText='만들기'
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
