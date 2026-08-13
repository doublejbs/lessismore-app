import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagTemplateSaveContent from '@/components/bag/BagTemplateSaveContent';
import {
  clearBagTemplateNameEditContext,
  getBagTemplateNameEditContext,
} from '@/model/bag-template/BagTemplateNameEditHandoff';

const BagTemplateSaveScreen = () => {
  const router = useRouter();
  const { sourceId, sourceName, mode } = useLocalSearchParams<{
    sourceId: string;
    sourceName: string;
    mode: string;
  }>();
  const editContext = mode === 'edit' ? getBagTemplateNameEditContext() : null;
  const [inputValue, setInputValue] = useState(
    editContext?.name ?? sourceName ?? ''
  );
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (saving || (!sourceId && !editContext)) {
      return;
    }

    const name = inputValue.trim();

    if (!name.length) {
      Alert.alert('템플릿 이름을 입력해주세요');

      return;
    }

    setSaving(true);

    try {
      if (editContext) {
        await editContext.onSave(name);
        app.getToastManager()?.show({ message: '템플릿 이름이 수정됐습니다' });
      } else {
        await app.getBagTemplateStore()!.saveFromBag(sourceId, name);
        app.getToastManager()?.show({ message: '템플릿으로 저장됐습니다' });
      }

      if (editContext) {
        clearBagTemplateNameEditContext();
      }
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
      title={editContext ? '템플릿 이름 수정' : '템플릿으로 저장'}
      inputValue={inputValue}
      disabled={saving}
      onChangeName={setInputValue}
      onConfirm={handleConfirm}
      onCancel={() => {
        if (editContext) {
          clearBagTemplateNameEditContext();
        }
        router.back();
      }}
    />
  );
};

export default BagTemplateSaveScreen;
