import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '@/model/app/App';

type CopyEntrySource = 'list' | 'add_sheet' | 'detail';

interface CopySource {
  id: string;
  name: string;
}

const useBagCopyState = () => {
  const [source, setSource] = useState<CopySource | null>(null);
  const [entrySource, setEntrySource] = useState<CopyEntrySource | null>(null);
  const [visible, setVisible] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs().add(1, 'day')
  );
  const router = useRouter();

  const open = (nextSource: CopySource, nextEntrySource: CopyEntrySource) => {
    setSource(nextSource);
    setEntrySource(nextEntrySource);
    app.getAnalyticsManager()?.logClick('bag_copy', { source: nextEntrySource });
    setInputValue(`${nextSource.name} 복사본`);
    setStartDate(dayjs());
    setEndDate(dayjs().add(1, 'day'));
    setVisible(true);
  };

  const handleChangeName = (text: string) => {
    setInputValue(text);
  };

  const handleStartDateChange = (date: dayjs.Dayjs) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    setEndDate(date);
  };

  const handleCancel = () => {
    setInputValue('');
    setVisible(false);
  };

  const handleConfirm = async () => {
    if (isCopying || !source) {
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('오류', '날짜를 선택해주세요');

      return;
    }

    const trimmedValue = inputValue.trim();

    if (!trimmedValue.length) {
      Alert.alert('배낭 이름을 입력해주세요');

      return;
    }

    setIsCopying(true);

    try {
      const bagID = await app
        .getBagStore()!
        .copy(source.id, trimmedValue, startDate, endDate);

      if (bagID) {
        app
          .getAnalyticsManager()
          ?.logClick('bag_copy_confirm', {
            source: entrySource ?? 'list',
          });
        app.getToastManager()?.show({ message: '복사됐습니다' });
        setInputValue('');
        setVisible(false);
        router.push(`/bag/${bagID}`);
        router.push(`/bag/${bagID}/edit`);
      }
    } catch (error) {
      console.error('배낭 복사 중 오류 발생:', error);
      Alert.alert(
        '오류',
        '배낭 복사 중 문제가 발생했습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsCopying(false);
    }
  };

  return {
    visible,
    inputValue,
    startDate,
    endDate,
    isCopying,
    open,
    handleChangeName,
    handleStartDateChange,
    handleEndDateChange,
    handleConfirm,
    handleCancel,
  };
};

export default useBagCopyState;
