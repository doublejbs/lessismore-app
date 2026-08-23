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
      Alert.alert(app.getL10n().t('app.templateSave.nameRequired'));

      return;
    }

    setSaving(true);

    try {
      if (editContext) {
        await editContext.onSave(name);
        app.getToastManager()?.show({ message: app.getL10n().t('app.templateSave.renamed') });
      } else {
        await app.getBagTemplateStore()!.saveFromBag(sourceId, name);
        app.getToastManager()?.show({ message: app.getL10n().t('app.templateSave.completed') });
      }

      if (editContext) {
        clearBagTemplateNameEditContext();
      }
      router.back();
    } catch (error) {
      console.error('템플릿 저장 중 오류 발생:', error); // l10n-ignore: 개발자 로그
      Alert.alert(
        app.getL10n().t('common.error'),
        app.getL10n().t('app.templateSave.failed')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BagTemplateSaveContent
      title={app.getL10n().t(editContext ? 'app.templateSave.editTitle' : 'app.templateSave.title')}
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
