import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { observer } from 'mobx-react-lite';

// 한 줄 푸터 링크의 44pt 터치 타깃 확보용 여유.
const LINK_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

interface Props {
  isLoggedIn: boolean;
}

const InfoFooterView: FC<Props> = ({ isLoggedIn }) => {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const l10n = app.getL10n();

  const handleOpenBusinessInfo = () => {
    router.push('/info/business');
  };

  return (
    <View style={styles.container}>
      {isLoggedIn && (
        <TouchableOpacity
          onPress={() => router.push('/info/delete')}
          activeOpacity={0.7}
        >
          <PretendardText style={styles.deleteAccountText}>
            {l10n.t('info.footer.deleteAccount')}
          </PretendardText>
        </TouchableOpacity>
      )}
      {/* 버전과 사업자 정보를 한 줄 양 끝에 둔다(AU-4). 예전에는 사업자 정보가 접히는 행이었는데,
          펼치면 가운데 정렬 푸터 안에 좌측 정렬 2열 블록이 끼어 축이 어긋났다. 전문은 별도 화면이 맡는다. */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <PretendardText style={styles.versionText}>
            {l10n.t('info.footer.version', { version: appVersion })}
          </PretendardText>
          <PretendardText style={styles.versionText}>
            {l10n.t('info.footer.copyright')}
          </PretendardText>
        </View>
        <TouchableOpacity
          style={styles.businessLink}
          onPress={handleOpenBusinessInfo}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('info.business.title')}
          hitSlop={LINK_HIT_SLOP}
        >
          <PretendardText style={styles.versionText}>
            {l10n.t('info.business.title')}
          </PretendardText>
          <Ionicons name='chevron-forward' size={12} color={Acg.textMuted} />
        </TouchableOpacity>
      </View>

      {/* 장식용 배지다 — 스크린 리더가 읽을 내용이 없으므로 접근성 트리에서 제외한다. */}
      <View
        style={styles.imageContainer}
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
      >
        <Image
          source={require('@/assets/images/internet.png')}
          style={styles.image}
          resizeMode='contain'
          accessible={false}
        />
        <Image
          source={require('@/assets/images/magma.png')}
          style={styles.image}
          resizeMode='contain'
          accessible={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    // 목록 마지막 행과 붙지 않게 띄운다. 아래 여백은 스크롤 컨테이너가 낸다.
    marginTop: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
    // 면을 깔지 않는다 — 지면(지형 배경)이 그대로 비쳐야 목록 카드와 위계가 갈린다.
    backgroundColor: 'transparent',
    gap: 8,
  },
  deleteAccountText: {
    ...AcgType.meta,
    color: Acg.textMuted,
    textDecorationLine: 'underline',
  },
  /**
   * 푸터 메타 줄(AU-4). **축을 좌·우 둘로만 둔다.**
   * 예전에는 버전(좌)·사업자 정보(우)·카피라이트(중앙)로 정렬이 세 방향이라 한 덩어리로
   * 읽히지 않았다. 카피라이트를 버전 아래로 붙여 좌측 묶음에 합쳤다.
   */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  metaLeft: {
    gap: 2,
  },
  businessLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  versionText: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  imageContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  // 정체를 알기 어려운 장식 배지라 크게 둘 이유가 없다(AU-4). 목록 썸네일과 같은 44pt.
  image: {
    width: 44,
    height: 44,
  },
});

export default observer(InfoFooterView);
