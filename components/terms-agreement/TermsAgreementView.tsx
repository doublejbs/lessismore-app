import { FC, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import { useRouter } from 'expo-router';
import Layout from '../Layout';
import PretendardText from '@/components/PretendardText';
import {
  PERSONAL_INFO_CONSENT_TEXT,
  PRIVACY_CONSENT_TEXT,
  TERMS_OF_SERVICE_TEXT,
} from '@/constants/LegalTexts';
import { Acg, AcgType, Color, Radius, Spacing } from '@/constants/DesignTokens';

const TermsAgreementView: FC = () => {
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [personalInfoAgreed, setPersonalInfoAgreed] = useState(false);
  const [over14Agreed, setOver14Agreed] = useState(false);
  const [smsAgreed, setSmsAgreed] = useState(false);
  const firebase = app.getFirebase();
  const router = useRouter();
  const l10n = app.getL10n();

  const allRequiredChecked =
    termsAgreed && privacyAgreed && personalInfoAgreed && over14Agreed;

  const handleSubmit = async () => {
    if (!allRequiredChecked) {
      Alert.alert(
        l10n.t('common.requiredAgreement'),
        l10n.t('auth.terms.requiredMessage')
      );
      return;
    }

    try {
      await firebase.termsAgreed(
        marketingAgreed,
        smsAgreed,
        termsAgreed,
        privacyAgreed,
        personalInfoAgreed,
        over14Agreed
      );
      // 약관 동의 후 앱 첫 화면으로 — 창고가 아니라 홈이다(HM-0).
      router.replace('/');
    } catch (error) {
      console.error('약관 동의 저장 오류:', error); // l10n-ignore console 개발자 로그
      Alert.alert(
        l10n.t('common.error'),
        l10n.t('auth.terms.saveErrorMessage')
      );
    }
  };

  // 체크박스 렌더링 함수
  const renderCheckbox = (
    isChecked: boolean,
    onChange: (checked: boolean) => void,
    label: string
  ) => {
    return (
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => onChange(!isChecked)}
      >
        <View style={styles.checkboxWrapper}>
          <View
            style={[
              styles.checkbox,
              isChecked ? styles.checkboxChecked : styles.checkboxUnchecked,
            ]}
          >
            {isChecked && (
              <PretendardText style={styles.checkmark} weight='bold'>
                ✓
              </PretendardText>
            )}
          </View>
        </View>
        <PretendardText
          style={styles.checkboxLabel}
          weight={isChecked ? 'bold' : 'regular'}
        >
          {label}
        </PretendardText>
      </TouchableOpacity>
    );
  };

  // 전체 동의 체크박스 핸들러
  const handleCheckAllRequired = (checked: boolean) => {
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setPersonalInfoAgreed(checked);
    setOver14Agreed(checked);
  };
  const handleCheckAll = (checked: boolean) => {
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setPersonalInfoAgreed(checked);
    setOver14Agreed(checked);
    setMarketingAgreed(checked);
    setSmsAgreed(checked);
  };
  const allChecked = allRequiredChecked && marketingAgreed && smsAgreed;

  return (
    <Layout>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <PretendardText style={styles.title} weight='bold'>
          {l10n.t('auth.terms.title')}
        </PretendardText>
        <View style={styles.sectionContainer}>
          {renderCheckbox(
            termsAgreed,
            setTermsAgreed,
            l10n.t('auth.terms.termsRequired')
          )}

          <ScrollView style={styles.termsTextContainer}>
            <PretendardText style={styles.termsText}>
              {TERMS_OF_SERVICE_TEXT}
            </PretendardText>
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(
            privacyAgreed,
            setPrivacyAgreed,
            l10n.t('auth.terms.privacyRequired')
          )}

          <ScrollView style={styles.termsTextContainer}>
            <PretendardText style={styles.termsText}>
              {PRIVACY_CONSENT_TEXT}
            </PretendardText>
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(
            personalInfoAgreed,
            setPersonalInfoAgreed,
            l10n.t('auth.terms.personalInfoRequired')
          )}
          <ScrollView style={styles.shortTextContainer}>
            <PretendardText style={styles.termsText}>
              {PERSONAL_INFO_CONSENT_TEXT}
            </PretendardText>
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(
            over14Agreed,
            setOver14Agreed,
            l10n.t('auth.terms.ageRequired')
          )}
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(smsAgreed, setSmsAgreed, l10n.t('auth.terms.sms'))}
        </View>

        <View style={styles.sectionContainer}>
          {renderCheckbox(
            marketingAgreed,
            setMarketingAgreed,
            l10n.t('auth.terms.marketing')
          )}
          <ScrollView style={styles.shortTextContainer}>
            <PretendardText style={styles.termsText}>
              {l10n.t('auth.terms.marketingDescription')}
            </PretendardText>
          </ScrollView>
        </View>
      </ScrollView>
      {/* 필수 전체 동의 체크박스 */}
      <View style={styles.requiredCheckboxContainer}>
        {renderCheckbox(
          allRequiredChecked,
          handleCheckAllRequired,
          l10n.t('auth.terms.requiredAll')
        )}
      </View>

      {/* 전체 동의 체크박스 (맨 아래) */}
      <View style={styles.allCheckboxContainer}>
        {renderCheckbox(allChecked, handleCheckAll, l10n.t('auth.terms.all'))}
      </View>
      <TouchableOpacity
        onPress={handleSubmit}
        style={[
          styles.submitButton,
          allRequiredChecked
            ? styles.submitButtonEnabled
            : styles.submitButtonDisabled,
        ]}
        disabled={!allRequiredChecked}
      >
        <PretendardText style={styles.submitButtonText} weight='semibold'>
          {l10n.t('auth.terms.submit')}
        </PretendardText>
      </TouchableOpacity>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  contentContainer: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    ...AcgType.screenTitle,
    marginBottom: Spacing.screenH,
    color: Color.textPrimary,
  },
  sectionContainer: {
    marginBottom: Spacing.screenH,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxWrapper: {
    marginRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.listThumb,
    borderWidth: 2,
    borderColor: Color.iconMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Color.textPrimary,
    borderColor: Color.textPrimary,
  },
  checkboxUnchecked: {
    backgroundColor: Color.background,
    borderColor: Color.iconMuted,
  },
  checkmark: {
    color: Color.background,
    ...AcgType.rowSubtitle,
  },
  checkboxLabel: {
    flex: 1,
    ...AcgType.rowSubtitle,
    color: Color.textPrimary,
  },
  termsTextContainer: {
    maxHeight: 150,
    padding: 10,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    marginLeft: 30,
    marginTop: 10,
  },
  shortTextContainer: {
    maxHeight: 100,
    padding: 10,
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    marginLeft: 30,
    marginTop: 10,
  },
  termsText: {
    ...AcgType.rowSubtitle,
    color: Color.textTertiary,
  },
  requiredCheckboxContainer: {
    backgroundColor: Color.surfaceMuted,
    borderWidth: 1.5,
    borderColor: Color.borderLight,
    borderRadius: Radius.card,
    padding: 16,
    marginTop: Spacing.section,
    marginBottom: 10,
  },
  allCheckboxContainer: {
    backgroundColor: Color.surfaceMuted,
    borderWidth: 1.5,
    borderColor: Color.borderLight,
    borderRadius: Radius.card,
    padding: 16,
    marginBottom: Spacing.screenH,
  },
  submitButton: {
    padding: 15,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonEnabled: {
    backgroundColor: Color.textPrimary,
  },
  submitButtonDisabled: {
    backgroundColor: Color.textSecondary,
  },
  submitButtonText: {
    color: Color.background,
    ...AcgType.control,
  },
});

export default observer(TermsAgreementView);
