/* eslint-disable react-hooks/refs -- 후기 작성 핸드오프는 마운트 시 스냅샷으로 고정한다. */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  InputAccessoryView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import StarRatingView from '@/components/camp-site/StarRatingView';
import CampSiteBagSelectSheetView from '@/components/camp-site/CampSiteBagSelectSheetView';
import { takeCampReviewWrite } from '@/model/camp-review/CampReviewWriteHandoff';
import BagItem from '@/model/bag/BagItem';
import { CampReviewInput } from '@/model/camp-review/CampReviewTypes';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import { observer } from 'mobx-react-lite';

const MAX_CONTENT_LENGTH = 1000;
// iOS 멀티라인 입력은 리턴키로 키보드를 못 닫으므로 키보드 위 '완료' 액세서리를 붙인다.
const CONTENT_ACCESSORY_ID = 'campReviewContentAccessory';

// 첨부 배낭의 표시/저장 스냅샷 — 실 배낭(BagItem) 선택분과 수정 시 기존 후기 스냅샷을 함께 다룬다.
interface AttachedBag {
  bagId: string;
  bagName: string;
  bagDate: string;
  bagWeight: string;
}

// BagItem을 첨부 스냅샷으로 변환한다. getWeight()는 number(kg)라 소수 2자리 문자열로 맞춘다.
const toAttachedBag = (bag: BagItem): AttachedBag => ({
  bagId: bag.getID(),
  bagName: bag.getName(),
  bagDate: bag.getDate(),
  bagWeight: bag.getWeight().toFixed(2),
});

// CS-8: 박지 후기 작성/수정 화면 — 네이티브 formSheet 라우트. 상태를 직접 소유한다.
const CampReviewWriteScreen = () => {
  const router = useRouter();
  // 마운트 시 핸드오프 파라미터를 1회 소비한다. 없으면 잘못된 진입이므로 즉시 닫는다.
  const paramsRef = useRef(takeCampReviewWrite());
  const params = paramsRef.current;
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';

  const existing = params?.existing ?? null;
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [content, setContent] = useState(existing?.content ?? '');
  const [attachedBag, setAttachedBag] = useState<AttachedBag | null>(
    // 수정 진입 시 기존 후기 스냅샷으로 우선 프리필한다(목록 로드 전에도 칩 표시).
    existing?.bagId
      ? {
          bagId: existing.bagId,
          bagName: existing.bagName ?? '',
          bagDate: existing.bagDate ?? '',
          bagWeight: existing.bagWeight ?? '',
        }
      : null
  );
  const [bags, setBags] = useState<BagItem[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 파라미터 없이 진입한 경우(딥링크 오조작 등) 즉시 닫는다.
  useEffect(() => {
    if (!params) {
      router.back();
    }
  }, [params, router]);

  // 배낭 목록을 로드하고, 수정 진입분은 실제 배낭 데이터로 스냅샷을 갱신한다.
  useEffect(() => {
    let active = true;

    const loadBags = async () => {
      try {
        const list = (await app.getBagStore()?.getList()) ?? [];

        if (!active) {
          return;
        }

        setBags(list);

        if (existing?.bagId) {
          const matched = list.find(bag => bag.getID() === existing.bagId);

          if (matched) {
            setAttachedBag(toAttachedBag(matched));
          }
        }
      } catch (error) {
        console.error('배낭 목록 로드 중 오류 발생:', error); // l10n-ignore: 개발자 로그
      }
    };

    void loadBags();

    return () => {
      active = false;
    };
  }, [existing]);

  const handleSelectBag = (bag: BagItem) => {
    setAttachedBag(toAttachedBag(bag));
    setSheetVisible(false);
  };

  const handleRemoveBag = () => {
    setAttachedBag(null);
  };

  const handleSubmit = async () => {
    if (submitting || !params) {
      return;
    }

    if (rating === 0) {
      return;
    }

    // 로그인 확인 — 미로그인이면 로그인 유도 후 중단한다.
    if (!app.getFirebase().isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    const userId = app.getFirebase().getUserId();
    const authorName = app.getFirebase().getNickname();
    const trimmedContent = content.trim();

    const input: CampReviewInput = {
      authorName,
      rating,
    };

    if (trimmedContent.length > 0) {
      input.content = trimmedContent;
    }

    if (attachedBag) {
      input.bagId = attachedBag.bagId;
      input.bagName = attachedBag.bagName;
      input.bagDate = attachedBag.bagDate;
      input.bagWeight = attachedBag.bagWeight;
    }

    setSubmitting(true);

    try {
      await app.getCampReviewStore()!.saveReview(params.spotId, userId, input);

      // 배낭을 첨부했으면 해당 배낭을 후기 공유 상태로 표시한다.
      if (attachedBag) {
        await app
          .getBagStore()!
          .updateReviewShared(attachedBag.bagId, userId, true);
      }

      // 저장 계측(CS-8) — click이 아닌 submit 이벤트라 logEvent로 직접 보낸다.
      app.getAnalyticsManager()?.logEvent('submit_camp_site_review', {
        rating,
        has_bag: attachedBag ? true : false,
      });

      params.onComplete();
      router.back();
    } catch (error) {
      console.error('후기 저장 중 오류 발생:', error); // l10n-ignore: 개발자 로그
      Alert.alert(app.getL10n().t('common.error'), app.getL10n().t('app.reviewWrite.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const l10n = app.getL10n();
  const title = l10n.t(existing ? 'app.reviewWrite.editTitle' : 'app.reviewWrite.title');
  const confirmDisabled = rating === 0 || submitting;

  // 본문(별점 + 후기 글 + 다녀온 배낭) — Android는 스크롤 컨테이너로 감싼다.
  const bodyContent = (
    <>
      <PretendardText weight='bold' style={styles.title}>
        {title}
      </PretendardText>

      <View style={styles.section}>
        <PretendardText weight='semibold' style={styles.label}>
          {l10n.t('app.reviewWrite.rating')}
        </PretendardText>
        <StarRatingView editable rating={rating} onChange={setRating} />
      </View>

      <View style={styles.section}>
        <PretendardText weight='semibold' style={styles.label}>
          {l10n.t('app.reviewWrite.content')}
        </PretendardText>
        <TextInput
          style={styles.contentInput}
          placeholder={l10n.t('app.reviewWrite.contentPlaceholder')}
          placeholderTextColor={Color.textSecondary}
          value={content}
          onChangeText={setContent}
          maxLength={MAX_CONTENT_LENGTH}
          multiline
          textAlignVertical='top'
          inputAccessoryViewID={isAndroid ? undefined : CONTENT_ACCESSORY_ID}
        />
        <PretendardText style={styles.counter}>
          {content.length}/{MAX_CONTENT_LENGTH}
        </PretendardText>
      </View>

      <View style={styles.section}>
        <PretendardText weight='semibold' style={styles.label}>
          {l10n.t('app.reviewWrite.bag')}
        </PretendardText>
        {attachedBag ? (
          <View style={styles.bagChip}>
            <View style={styles.bagChipText}>
              <PretendardText
                weight='semibold'
                style={styles.bagChipName}
                numberOfLines={1}
              >
                {attachedBag.bagName}
              </PretendardText>
              <PretendardText style={styles.bagChipMeta} numberOfLines={1}>
                {[attachedBag.bagDate, `${attachedBag.bagWeight}kg`]
                  .filter(Boolean)
                  .join(' · ')}
              </PretendardText>
            </View>
            <TouchableOpacity
              onPress={handleRemoveBag}
              style={styles.bagChipRemove}
              accessibilityRole='button'
              accessibilityLabel={l10n.t('app.reviewWrite.removeBag')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name='close' size={20} color={Color.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.bagSelectRow}
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('app.reviewWrite.selectBag')}
          >
            <Ionicons
              name='briefcase-outline'
              size={20}
              color={Color.textSecondary}
            />
            <PretendardText style={styles.bagSelectText}>
              {l10n.t('app.reviewWrite.selectBag')}
            </PretendardText>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.container,
        isAndroid && styles.containerFill,
        {
          // Android formSheet는 제스처 바 인셋을 제대로 못 잡아 하단 패딩을 넉넉히 확보한다.
          paddingBottom: isAndroid
            ? Math.max(insets.bottom, 24)
            : Math.max(insets.bottom - 12, 12),
        },
      ]}
    >
      {isAndroid ? (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
        >
          {bodyContent}
        </ScrollView>
      ) : (
        // iOS: 빈 영역을 탭하면 키보드를 닫는다(멀티라인 입력 대응).
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.body}>{bodyContent}</View>
        </TouchableWithoutFeedback>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <PretendardText weight='semibold' style={styles.cancelButtonText}>
            {l10n.t('common.cancel')}
          </PretendardText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            confirmDisabled && styles.confirmButtonDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.7}
          disabled={confirmDisabled}
        >
          <PretendardText weight='semibold' style={styles.confirmButtonText}>
            {l10n.t('common.confirm')}
          </PretendardText>
        </TouchableOpacity>
      </View>

      <CampSiteBagSelectSheetView
        visible={sheetVisible}
        bags={bags}
        spotName={params?.spotName ?? ''}
        onClose={() => setSheetVisible(false)}
        onSelect={handleSelectBag}
        onCreateNew={() => setSheetVisible(false)}
        hideCreateNew
        subtitleOverride={l10n.t('app.reviewWrite.selectBagSubtitle')}
      />

      {/* iOS 키보드 위 '완료' 바 — 멀티라인 입력에서 키보드를 내린다. */}
      {!isAndroid && (
        <InputAccessoryView nativeID={CONTENT_ACCESSORY_ID}>
          <View style={styles.accessoryBar}>
            <TouchableOpacity
              onPress={() => Keyboard.dismiss()}
              accessibilityRole='button'
              accessibilityLabel={l10n.t('app.reviewWrite.keyboardClose')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <PretendardText weight='semibold' style={styles.accessoryDone}>
                {l10n.t('common.done')}
              </PretendardText>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.background,
    // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래로 제목이 오도록 여백을 준다.
    paddingTop: 52,
  },
  // Android는 고정 높이(0.9) 시트라 컨테이너를 채워 버튼을 하단에 고정한다.
  containerFill: {
    flex: 1,
  },
  bodyScroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    ...AcgType.screenTitle,
    color: Color.textPrimary,
    marginBottom: 24,
  },
  section: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 24,
  },
  label: {
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
  contentInput: {
    ...AcgType.control,
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    minHeight: 100,
  },
  counter: {
    ...AcgType.meta,
    alignSelf: 'flex-end',
    // 스케일 최소 단으로 올림 — 12는 가독 한계
    color: Color.textSecondary,
  },
  bagSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
  },
  bagSelectText: {
    ...AcgType.rowTitle,
    color: Color.textSecondary,
  },
  bagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.input,
    backgroundColor: Color.surfaceMuted,
  },
  bagChipText: {
    flex: 1,
    gap: 2,
  },
  bagChipName: {
    ...AcgType.rowTitle,
    color: Color.textPrimary,
  },
  bagChipMeta: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  bagChipRemove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...AcgType.control,
    color: Color.textPrimary,
  },
  confirmButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    ...AcgType.control,
    color: Color.background,
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Color.surfaceMuted,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
  },
  accessoryDone: {
    ...AcgType.control,
    color: Color.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default observer(CampReviewWriteScreen);
