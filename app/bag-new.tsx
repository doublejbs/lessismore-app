import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import BagFormContent from '@/components/bag/BagFormContent';
import BagWeather from '@/model/bag/BagWeather';
import { takePendingBagLocation } from '@/model/bag/PendingBagLocationHandoff';

// BAG-2: 배낭 생성 폼 — 네이티브 formSheet 라우트.
// **박지 상세(CS-5) '새 배낭 만들기' 전용 경로다.** 배낭 탭의 `새로 만들기`는 입력을 받지 않고
// 즉시 생성하므로(BAG-2) 이 화면을 거치지 않는다 — 여기는 여행지 이름·날씨를 함께 붙인다.
const BagNewScreen = () => {
  const router = useRouter();
  // 박지 상세(CS-5) '새 배낭 만들기'로 진입했다면 여행지 위치를 마운트 시 1회 받아
  // 이름 프리필과 생성 후 위치 저장에 함께 쓴다.
  const pendingLocationRef = useRef(takePendingBagLocation());
  const [inputValue, setInputValue] = useState(
    pendingLocationRef.current?.name ?? ''
  );
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(
    dayjs().add(1, 'day')
  );
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) {
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

    setSubmitting(true);

    try {
      const bagID = await app.getBagStore()!.add(name, startDate, endDate);

      if (bagID) {
        app.getAnalyticsManager()?.logClick('bag_create_confirm');
        let weatherFailed = false;

        // 박지 상세(CS-5) '새 배낭 만들기'로 진입했다면 여행지를 붙이고,
        // 방금 정한 여행 기간의 날씨까지 바로 조회·저장한다(DST-5).
        // 날씨 조회 실패는 생성 흐름을 막지 않고 생성 후 별도로 안내한다.
        if (pendingLocationRef.current) {
          try {
            const bagWeather = BagWeather.of(bagID, app.getBagStore()!);

            bagWeather.hydrate(null, null, startDate, endDate);

            await bagWeather.updateLocation(pendingLocationRef.current);
            weatherFailed = bagWeather.hasError();
          } catch (error) {
            // 배낭 생성은 이미 완료됐으므로 생성 폼에 머물러 중복 생성되지 않게 하고,
            // 여행지만 나중에 다시 설정할 수 있도록 생성된 배낭으로 계속 이동한다.
            console.error('새 배낭 여행지 저장 실패:', error);
            Alert.alert(
              '여행지 저장 실패',
              '배낭은 만들었지만 여행지를 저장하지 못했어요.'
            );
          }
        }

        // 만든 뒤 상세로만 보낸다(BAG-2) — 장비 편집 화면을 겹쳐 열지 않는다.
        router.replace(`/bag/${bagID}`);

        if (weatherFailed) {
          Alert.alert(
            '날씨를 불러오지 못했어요',
            '여행지는 저장했어요. 여행지 화면에서 다시 시도할 수 있어요.',
            [
              { text: '확인', style: 'cancel' },
              {
                text: '다시 시도',
                onPress: () => router.push(`/bag/${bagID}/weather`),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('배낭 추가 중 오류 발생:', error);
      Alert.alert(
        '오류',
        '배낭 추가 중 문제가 발생했습니다. 다시 시도해주세요.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BagFormContent
      title='새 배낭'
      inputValue={inputValue}
      startDate={startDate}
      endDate={endDate}
      confirmText='확인'
      disabled={submitting}
      onChangeName={setInputValue}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onConfirm={handleConfirm}
      onCancel={() => router.back()}
    />
  );
};

export default BagNewScreen;
