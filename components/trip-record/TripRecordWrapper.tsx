import { FC, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import LoadingView from '@/components/ui/LoadingView';
import TripRecord from '@/model/trip-record/TripRecord';
import TripRecordEntrySource from '@/model/trip-record/TripRecordEntrySource';
import TripRecordStatus from '@/model/trip-record/TripRecordStatus';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import TripRecordView from './TripRecordView';
import TripRecordUnavailableView from './TripRecordUnavailableView';

interface Props {
  bagId: string;
  entrySource: string | null;
}

const toEntrySource = (value: string | null): TripRecordEntrySource => {
  const sources = Object.values(TripRecordEntrySource) as string[];

  return value && sources.includes(value)
    ? (value as TripRecordEntrySource)
    : TripRecordEntrySource.Direct;
};

/**
 * 여행 기록 시트의 상태 수명과 진입 분기를 담당한다(CM-16).
 * 이미 기록이 있으면 시트를 쓰지 않고 바로 보낸다 — 알림에서 왔으면 사용 기록(NT-3), 그 외는 게시글 상세.
 */
const TripRecordWrapper: FC<Props> = ({ bagId, entrySource }) => {
  const router = useRouter();
  const [tripRecord] = useState(() =>
    TripRecord.from(bagId, toEntrySource(entrySource))
  );
  const status = tripRecord.getStatus();

  useEffect(() => {
    void tripRecord.initialize();
  }, [tripRecord]);

  useEffect(() => {
    if (status !== TripRecordStatus.Existing) {
      return;
    }

    const postId = tripRecord.getExistingPostId();

    if (
      tripRecord.getEntrySource() === TripRecordEntrySource.Notification ||
      !postId
    ) {
      router.replace(`/useless/${bagId}` as Href);

      return;
    }

    router.replace(`/community/${postId}` as Href);
  }, [bagId, router, status, tripRecord]);

  // 게시하지 않고 닫으면 업로드된 사진을 정리한다(CM-6). 게시 중이면 `discard()`가 건너뛴다.
  useEffect(() => {
    return () => {
      void tripRecord.discard();
    };
  }, [tripRecord]);

  if (status === TripRecordStatus.Ready) {
    return <TripRecordView tripRecord={tripRecord} />;
  }

  if (
    status === TripRecordStatus.NotEnded ||
    status === TripRecordStatus.Unavailable
  ) {
    return (
      <TripRecordUnavailableView
        message={app
          .getL10n()
          .t(
            status === TripRecordStatus.NotEnded
              ? 'tripRecord.notEnded'
              : 'tripRecord.unavailable'
          )}
        onClose={() => {
          // 진입처를 모르면(딥링크 직접 진입) 돌아갈 화면이 없을 수 있어 배낭 상세로 보낸다.
          if (tripRecord.getEntrySource() === TripRecordEntrySource.Direct) {
            router.replace(`/bag/${bagId}` as Href);

            return;
          }

          router.back();
        }}
      />
    );
  }

  return (
    <View style={styles.loading}>
      <LoadingView />
    </View>
  );
};

const styles = StyleSheet.create({
  loading: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.paper,
  },
});

export default observer(TripRecordWrapper);
