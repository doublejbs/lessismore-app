import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagTemplateSaveContent from '@/components/bag/BagTemplateSaveContent';

const BagTemplateSaveScreen = () => {
  const router = useRouter();
  const { sourceId, sourceName } = useLocalSearchParams<{
    sourceId: string;
    sourceName: string;
  }>();
  const [inputValue, setInputValue] = useState(sourceName ?? '');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (saving || !sourceId) {
      return;
    }

    const name = inputValue.trim();

    if (!name.length) {
      Alert.alert('템플릿 이름을 입력해주세요');

      return;
    }

    setSaving(true);

    try {
      await app.getBagTemplateStore()!.saveFromBag(sourceId, name);
      app.getToastManager()?.show({ message: '템플릿으로 저장됐습니다' });
      router.back();
    } catch (error) {
      console.error('템플릿 저장 중 오류 발생:', error);
      Alert.alert(
        '오류',
        '템플릿 저장 중 문제가 발생했습니다. 다시 시도해주세요.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BagTemplateSaveContent
      inputValue={inputValue}
      disabled={saving}
      onChangeName={setInputValue}
      onConfirm={handleConfirm}
      onCancel={() => router.back()}
    />
  );
};

export default BagTemplateSaveScreen;
