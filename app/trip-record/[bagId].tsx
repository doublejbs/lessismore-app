import { useLocalSearchParams } from 'expo-router';
import TripRecordWrapper from '@/components/trip-record/TripRecordWrapper';

/**
 * 여행 기록 시트 라우트다(CM-16). `entrySource`는 측정용 진입처(`notification`·`bag_detail`·`home`).
 */
const TripRecordRoute = () => {
  const { bagId, entrySource } = useLocalSearchParams<{
    bagId: string;
    entrySource?: string;
  }>();

  return <TripRecordWrapper bagId={bagId} entrySource={entrySource ?? null} />;
};

export default TripRecordRoute;
