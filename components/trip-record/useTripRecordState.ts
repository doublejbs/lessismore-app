import { useEffect, useRef } from 'react';
import { Href, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/native';
import app from '@/model/app/App';
import CommunityError from '@/model/community/CommunityError';
import CommunityValidationError from '@/model/community/CommunityValidationError';
import CommunityImagePipelineError from '@/model/community-image/CommunityImagePipelineError';
import CommunityWriteField from '@/model/community-write/CommunityWriteField';
import TripRecord from '@/model/trip-record/TripRecord';
import TripRecordEntrySource from '@/model/trip-record/TripRecordEntrySource';
import {
  clearTripRecordDone,
  setTripRecordDone,
} from '@/model/trip-record/TripRecordDoneHandoff';

/**
 * 여행 기록 시트의 게시·닫기 흐름(CM-16).
 *
 * 게시에 성공하면 시트를 닫고 배낭 상세 위에 완료 카드를 띄운다(완료 문구는 카드가 말한다 — 토스트를
 * 따로 띄우지 않는다). 배낭 상세에서 연 시트면 그 화면으로 돌아가고, 그 밖에서 연 시트면 시트를
 * 배낭 상세로 바꾼다(완료 카드는 배낭 상세가 포커스될 때 핸드오프로 띄운다).
 * 게시 중에는 시트를 닫지 못한다 — 올리는 중인 사진이 정리되거나 게시가 끊기지 않게.
 */
const useTripRecordState = (tripRecord: TripRecord) => {
  const router = useRouter();
  const navigation = useNavigation();
  const l10n = app.getL10n();
  const write = tripRecord.getWrite();
  const busy = tripRecord.isBusy();
  // 게시 직후 같은 틱에 화면을 옮기므로 상태가 아니라 ref로 잠금을 푼다(GroupEditView와 같은 이유).
  const completedRef = useRef(false);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    return () => {
      unmountedRef.current = true;
    };
  }, []);

  usePreventRemove(busy, ({ data }) => {
    if (completedRef.current) {
      navigation.dispatch(data.action);

      return;
    }

    app.getToastManager()?.show({ message: l10n.t('common.processing') });
  });

  const leaveToBag = () => {
    completedRef.current = true;

    if (tripRecord.getEntrySource() === TripRecordEntrySource.BagDetail) {
      router.back();

      return;
    }

    router.replace(`/bag/${tripRecord.getBagId()}` as Href);
  };

  const handleClose = () => {
    if (busy) {
      return;
    }

    // 진입처를 모르면(딥링크 직접 진입) 돌아갈 화면이 없을 수 있어 배낭 상세로 보낸다.
    if (tripRecord.getEntrySource() === TripRecordEntrySource.Direct) {
      router.replace(`/bag/${tripRecord.getBagId()}` as Href);

      return;
    }

    router.back();
  };

  const handleSubmit = async () => {
    if (!app.getFirebase().isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    try {
      const result = await tripRecord.submit();

      if (!result) {
        return;
      }

      if (result.existing) {
        app.getToastManager()?.show({
          message: l10n.t('tripRecord.alreadyRecorded'),
        });

        if (unmountedRef.current) {
          return;
        }

        completedRef.current = true;
        router.replace(`/community/${result.postId}` as Href);

        return;
      }

      // 시트가 이미 사라졌으면 화면을 옮기지 않고 핸드오프만 지운다 — 엉뚱한 화면에 카드가 뜨지 않게.
      if (unmountedRef.current) {
        clearTripRecordDone();

        return;
      }

      setTripRecordDone({
        bagId: tripRecord.getBagId(),
        postId: result.postId,
      });
      leaveToBag();
    } catch (error) {
      if (error instanceof CommunityError) {
        if (error.code === CommunityValidationError.NotLoggedIn) {
          app.getLogInAlertManager()?.show();

          return;
        }

        // 제목 길이 같은 입력 오류는 필드 아래 문구로 보인다 — 그 밖의 오류만 토스트로 알린다.
        if (!write.getFieldErrors().has(CommunityWriteField.Title)) {
          app
            .getToastManager()
            ?.show({ message: l10n.t('community.write.failed') });
        }

        return;
      }

      app.getToastManager()?.show({
        message:
          error instanceof CommunityImagePipelineError
            ? l10n.t('community.write.image.failed')
            : l10n.t('community.write.failed'),
      });
    }
  };

  const getTitleError = (): string | null => {
    return write.getFieldErrors().has(CommunityWriteField.Title)
      ? l10n.t('community.validation.titleLength')
      : null;
  };

  return {
    write,
    handleClose,
    handleSubmit,
    getTitleError,
  };
};

export default useTripRecordState;
