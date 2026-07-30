import { FC, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';

interface Props {
  isLoggedIn: boolean;
}

/**
 * 사업자 정보 표시 항목(AU-4).
 *
 * **주소·통신판매업 신고번호·생년월일은 넣지 않는다** — 스펙에 근거가 적혀 있다.
 * 통신판매업 신고를 하면 영업소 소재지가 표시 의무가 되므로 그때 주소를 추가한다.
 */
const BUSINESS_INFO: { label: string; value: string }[] = [
  { label: '상호', value: '마그마' },
  { label: '대표자', value: '장하림' },
  { label: '사업자등록번호', value: '167-58-00828' },
  { label: '이메일', value: 'doublejbs@naver.com' },
];

const InfoFooterView: FC<Props> = ({ isLoggedIn }) => {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  // 접힘이 기본이다(AU-4) — 펼쳐 두면 하단이 법무 텍스트로 무거워진다.
  const [isBusinessInfoOpen, setIsBusinessInfoOpen] = useState(false);

  const handleToggleBusinessInfo = () => {
    setIsBusinessInfoOpen(open => !open);
  };

  return (
    <View style={styles.container}>
      {isLoggedIn && (
        <TouchableOpacity
          onPress={() => router.push('/info/delete')}
          activeOpacity={0.7}
        >
          <PretendardText style={styles.deleteAccountText}>
            탈퇴하기
          </PretendardText>
        </TouchableOpacity>
      )}
      <PretendardText style={styles.versionText}>
        버전 {appVersion}
      </PretendardText>
      <TouchableOpacity
        style={styles.businessToggle}
        onPress={handleToggleBusinessInfo}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityState={{ expanded: isBusinessInfoOpen }}
        accessibilityLabel='사업자 정보'
      >
        <PretendardText style={styles.businessToggleText}>
          사업자 정보
        </PretendardText>
        <Ionicons
          name={isBusinessInfoOpen ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={Color.textSecondary}
        />
      </TouchableOpacity>

      {isBusinessInfoOpen ? (
        <View style={styles.businessInfoContainer}>
          {BUSINESS_INFO.map(({ label, value }) => (
            <View key={label} style={styles.businessInfoRow}>
              <PretendardText style={styles.businessInfoLabel}>
                {label}
              </PretendardText>
              <PretendardText style={styles.businessInfoValue} selectable>
                {value}
              </PretendardText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.appInfoContainer}>
        <PretendardText style={styles.appInfoText}>
          Copyright 2026 useless. All rights reserved.
        </PretendardText>
      </View>
      <View style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/internet.png')}
          style={styles.image}
          resizeMode='contain'
        />
        <Image
          source={require('@/assets/images/magma.png')}
          style={styles.image}
          resizeMode='contain'
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 60 : 0,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
    backgroundColor: Color.background,
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 12,
    color: Color.textTertiary,
    textDecorationLine: 'underline',
  },
  versionText: {
    fontSize: 11,
    color: Color.textSecondary,
  },
  // 아이콘까지 한 덩어리로 눌리게 하고, 세로 여백으로 44pt 터치 타깃을 만든다.
  businessToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  businessToggleText: {
    fontSize: 11,
    color: Color.textSecondary,
  },
  businessInfoContainer: {
    gap: 4,
    paddingBottom: 4,
  },
  // 라벨 폭을 고정해 값의 시작 위치를 세로로 맞춘다.
  businessInfoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  businessInfoLabel: {
    width: 84,
    fontSize: 11,
    color: Color.textTertiary,
  },
  // `flex: 1`을 주면 안 된다 — 푸터가 가운데 정렬이라 이 행의 폭이 내용으로 정해지는데,
  // 그 안에서 flex가 0으로 접혀 값이 통째로 사라진다. 라벨 폭 고정만으로 열이 맞는다.
  businessInfoValue: {
    fontSize: 11,
    color: Color.textSecondary,
  },
  appInfoContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  appInfoText: {
    fontSize: 11,
    color: Color.textSecondary,
  },
  imageContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  image: {
    width: 70,
    height: 70,
  },
});

export default InfoFooterView;
