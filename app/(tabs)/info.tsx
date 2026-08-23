import { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layout from '@/components/Layout';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import InfoFooterView from '@/components/info/InfoFooterView';
import InfoFooterBackgroundView from '@/components/info/InfoFooterBackgroundView';
import PretendardText from '@/components/PretendardText';
import AppLanguage from '@/model/l10n/AppLanguage';
import {
  Acg,
  AcgLayout,
  AcgType,
  Color,
  Radius,
} from '@/constants/DesignTokens';

// 편집 아이콘(20pt)에 44pt 터치 타깃을 만들기 위한 여유(AU-4). (44 − 20) / 2 = 12.
const EDIT_ICON_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const FOREST_ASPECT_RATIO = 1804 / 872;
const IOS_EDGES = ['top', 'left', 'right'] as const;

const InfoView: FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [editedNickname, setEditedNickname] = useState('');
  const firebase = app.getFirebase();
  const l10n = app.getL10n();
  const isLoggedIn = firebase.isLoggedIn();
  const nickname = firebase.getNickname();
  const logInAlertManager = app.getLogInAlertManager();
  const forestHeight = screenWidth / FOREST_ASPECT_RATIO;
  const scrollBottomPadding =
    forestHeight +
    AcgLayout.scrollBottom +
    (Platform.OS === 'ios' ? insets.bottom : 0);

  // 로그아웃은 되돌리려면 다시 로그인해야 하는 액션이라 확인 알럿을 거친다(AU-4, 2026-08-13).
  const handleLogout = () => {
    app.getAlertManager()?.show({
      message: '로그아웃할까요?',
      confirmText: '로그아웃',
      onConfirm: async () => {
        app.getAnalyticsManager()?.logClick('logout');
        await firebase.logout();
      },
    });
  };

  const handleLogin = () => {
    logInAlertManager?.show();
  };

  const handleOpenKakao = () => {
    app.getAnalyticsManager()?.logClick('info_contact');
    Linking.openURL('http://pf.kakao.com/_VJwSn');
  };

  const handleOpenNotificationSettings = () => {
    router.push('/info/notification');
  };

  const handleOpenLanguageSettings = () => {
    router.push('/info/language' as never);
  };

  // 행 우측 값은 현재 적용 언어의 자기 표기다(L10N-5). `시스템 설정 따르기` 표기는
  // 두지 않는다(2026-08-23 사용자 결정) — 저장값이 없어도 시스템에서 유도한 언어를 보여준다.
  const languageLabel =
    l10n.language === AppLanguage.Korean
      ? '한국어'
      : l10n.language === AppLanguage.English
        ? 'English'
        : '日本語';

  const handleOpenPrivacyPolicy = () => {
    router.push('/info/policy?tab=privacy');
  };

  const handleOpenTerms = () => {
    router.push('/info/policy?tab=terms');
  };

  const handleEditNickname = () => {
    setEditedNickname(nickname || '');
    setIsEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    if (editedNickname.trim() === '') {
      setIsEditingNickname(false);
      return;
    }

    if (editedNickname === nickname) {
      setIsEditingNickname(false);
      return;
    }

    try {
      await firebase.updateNickname(editedNickname.trim());
      setIsEditingNickname(false);
    } catch (error) {
      console.error('Failed to update nickname:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingNickname(false);
    setEditedNickname('');
  };

  return (
    <Layout
      edges={Platform.OS === 'ios' ? IOS_EDGES : undefined}
      paddingHorizontal={0}
      background={<InfoFooterBackgroundView />}
    >
      <View style={styles.contentLayer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {/* AU-4: 화면 타이틀은 로그인 여부와 무관하게 고정한다. 닉네임은 아래 프로필 행이 맡는다 —
              닉네임은 `내 정보`의 값이지 화면 이름이 아니다. */}
          {/* 화면 제목 44px(ACG). 형광펜 띠 없음 — 한글이라 콘덴스드도 쓰지 않는다. */}
          <PretendardText weight='bold' style={styles.headerText}>
            내 정보
          </PretendardText>
        </View>

        {isLoggedIn ? (
          <View style={styles.profileRow}>
            {nickname ? (
              <>
                <PretendardText
                  weight='semibold'
                  style={styles.profileNickname}
                  numberOfLines={1}
                >
                  {nickname}
                </PretendardText>
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={handleEditNickname}
                  activeOpacity={0.7}
                  accessibilityRole='button'
                  accessibilityLabel='닉네임 수정'
                  hitSlop={EDIT_ICON_HIT_SLOP}
                >
                  <Ionicons
                    name='create-outline'
                    size={20}
                    color={Color.textSecondary}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={handleEditNickname}
                activeOpacity={0.7}
                accessibilityRole='button'
                style={styles.setNicknameButton}
              >
                <PretendardText
                  weight='bold'
                  style={styles.setNicknameButtonText}
                >
                  닉네임 설정하기
                </PretendardText>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* 미로그인 상태의 `로그인`은 이 화면의 주 액션이라 맨 위에 둔다.
            반대로 `로그아웃`은 목록 맨 아래로 내린다(AU-4). */}
        {!isLoggedIn ? (
          <TouchableOpacity
            style={[styles.button, styles.buttonFirst]}
            onPress={handleLogin}
            activeOpacity={0.7}
            accessibilityRole='button'
          >
            <PretendardText weight='semibold' style={styles.buttonText}>
              로그인
            </PretendardText>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.button, isLoggedIn && styles.buttonFirst]}
          onPress={handleOpenNotificationSettings}
          activeOpacity={0.7}
          accessibilityRole='button'
        >
          <PretendardText weight='semibold' style={styles.buttonText}>
            알림 설정
          </PretendardText>
          <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleOpenLanguageSettings}
          activeOpacity={0.7}
          accessibilityRole='button'
        >
          <PretendardText weight='semibold' style={styles.buttonText}>
            {l10n.t('info.language.rowLabel')}
          </PretendardText>
          <View style={styles.rowAccessory}>
            <PretendardText
              style={styles.rowSubtitle}
              numberOfLines={1}
            >
              {languageLabel}
            </PretendardText>
            <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleOpenKakao}
          activeOpacity={0.7}
          accessibilityRole='button'
        >
          <PretendardText weight='semibold' style={styles.buttonText}>
            서비스 문의
          </PretendardText>
          <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
        </TouchableOpacity>

        {/* 전문은 별도 화면이 맡는다(AU-4) — 인라인 아코디언은 스크롤이 수천 pt로 늘어났다. */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleOpenPrivacyPolicy}
          activeOpacity={0.7}
          accessibilityRole='button'
        >
          <PretendardText weight='semibold' style={styles.buttonText}>
            개인정보 처리방침
          </PretendardText>
          <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
        </TouchableOpacity>

        {/* 가입 시 동의를 받으면서(AU-3) 나중에 볼 경로가 없었다. */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleOpenTerms}
          activeOpacity={0.7}
          accessibilityRole='button'
        >
          <PretendardText weight='semibold' style={styles.buttonText}>
            이용약관
          </PretendardText>
          <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
        </TouchableOpacity>

        {/* 목록의 **마지막 정식 행**이다(AU-4). 예전에 첫 항목이었던 것도, 구분선 없이
            가운데에 띄웠던 것도 모두 좋지 않았다 — 띄우면 목록에도 푸터에도 속하지 않은 채
            붕 뜬다. 행 구조는 유지하고 화살표를 빼고 글자색만 낮춰 성격 차이를 낸다. */}
        {isLoggedIn ? (
          <TouchableOpacity
            style={styles.button}
            onPress={handleLogout}
            activeOpacity={0.7}
            accessibilityRole='button'
          >
            <PretendardText weight='semibold' style={styles.logoutText}>
              로그아웃
            </PretendardText>
          </TouchableOpacity>
        ) : null}

        {/* 버전·사업자 정보 푸터는 스크롤 콘텐츠 끝에 둔다. forest 일러스트는
            Layout의 하단 고정 background 레이어가 맡는다(AU-4). */}
        <View style={styles.footerSlot}>
          <InfoFooterView isLoggedIn={isLoggedIn} />
        </View>
      </ScrollView>
      </View>

      <Modal
        visible={isEditingNickname}
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={handleCancelEdit}
          activeOpacity={1}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <PretendardText weight='bold' style={styles.modalTitle}>
                  {nickname ? '닉네임 수정' : '닉네임 설정'}
                </PretendardText>
                <PretendardText style={styles.modalDescription}>
                  {nickname
                    ? '새로운 닉네임을 입력해주세요'
                    : '사용하실 닉네임을 입력해주세요'}
                </PretendardText>

                <TextInput
                  value={editedNickname}
                  onChangeText={setEditedNickname}
                  placeholder='닉네임을 입력하세요'
                  style={styles.textInput}
                  autoFocus
                  onSubmitEditing={handleSaveNickname}
                  returnKeyType='done'
                />
              </ScrollView>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  style={styles.modalCancelButton}
                  activeOpacity={0.7}
                >
                  <PretendardText
                    weight='medium'
                    style={styles.modalCancelButtonText}
                  >
                    취소
                  </PretendardText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveNickname}
                  disabled={editedNickname.trim() === ''}
                  style={[
                    styles.modalSaveButton,
                    {
                      backgroundColor:
                        editedNickname.trim() === ''
                          ? Color.textSecondary
                          : Color.textPrimary,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <PretendardText
                    weight='semibold'
                    style={styles.modalSaveButtonText}
                  >
                    저장
                  </PretendardText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </Layout>
  );
};

const { height: screenHeight } = Dimensions.get('window');

// 모달 하단과 키보드 사이 여백. 0이면 버튼이 키보드에 눌린 것처럼 보인다.
const MODAL_KEYBOARD_GAP = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentLayer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerText: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: AcgLayout.screenH,
  },
  // 짧은 콘텐츠에서는 푸터를 스크롤 영역 끝으로 밀어 올린다(AU-4).
  footerSlot: {
    marginTop: 'auto',
  },
  // 타이틀 아래 프로필 행(AU-4). 닉네임과 편집 아이콘을 한 줄로 둔다.
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  // 사용자 정체성이라 부가정보처럼 물러나 보이면 안 된다 — 본문색으로 세운다.
  profileNickname: {
    ...AcgType.rowTitle,
    color: Color.textPrimary,
    flexShrink: 1,
  },
  // 시각 크기는 그대로 두고 hitSlop으로 44pt를 확보한다(AU-4).
  editIconButton: {
    padding: 4,
  },
  setNicknameButton: {
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  setNicknameButtonText: {
    // 닉네임 자리를 대신하는 링크라 프로필 이름과 같은 단으로 둔다.
    ...AcgType.rowTitle,
    textDecorationLine: 'underline',
  },
  // HM-8 목록 문법 — 면 없이 헤어라인으로 가르고, 글자는 화면 패딩 정렬선에 붙는다(AU-4).
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  // 목록의 첫 행에는 헤어라인을 두지 않는다 — 제목 밑줄로 읽힌다(HM-8).
  buttonFirst: {
    borderTopWidth: 0,
  },
  buttonText: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  rowAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  rowSubtitle: {
    ...AcgType.rowSubtitle,
    color: Acg.textSecondary,
    flexShrink: 1,
  },
  // 로그아웃(AU-4). 행 구조는 일반 메뉴와 같게 두고 **글자색만** 낮춰 성격 차이를 낸다.
  logoutText: {
    ...AcgType.rowTitle,
    color: Acg.textSecondary,
  },
  privacyContainer: {
    marginBottom: 24,
  },
  privacyWrapper: {
    backgroundColor: Color.background,
  },
  privacyContent: {
    paddingVertical: 16,
    backgroundColor: Color.background,
  },
  privacyText: {
    ...AcgType.sectionSubtitle,
    color: Color.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: 16,
    // 버튼 아래가 키보드에 딱 붙어 눌린 것처럼 보였다(2026-08-04 시뮬레이터 확인).
    paddingBottom: 16 + MODAL_KEYBOARD_GAP,
    maxHeight: screenHeight * 0.7,
  },
  modalScrollView: {
    flexGrow: 0,
    marginBottom: 16,
  },
  modalTitle: {
    ...AcgType.sectionTitle,
    color: Color.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
    padding: 14,
    borderWidth: 1,
    borderColor: Acg.line2,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.input,
    // 단일행 입력이라 줄간은 싣지 않는다(안드로이드에서 커서가 어긋난다).
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  // 흰 면 위 아웃라인이라 테두리가 거의 안 보였다 — 한 단계 진한 선을 쓴다.
  modalCancelButton: {
    flex: 1,
    backgroundColor: Color.background,
    padding: 12,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Color.borderLight,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    ...AcgType.control,
    color: Color.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    padding: 12,
    borderRadius: Radius.input,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    ...AcgType.control,
    color: Color.background,
  },
  imageContainer: {
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 200,
  },
});

export default observer(InfoView);
