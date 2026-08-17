import { FC, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagTemplate from '@/model/bag/BagTemplate';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import {
  Acg,
  AcgRow,
  AcgType,
} from '@/constants/DesignTokens';

interface Props {
  template: BagTemplate;
  onDelete: (template: BagTemplate) => void;
  divided?: boolean;
  onPress?: () => void;
  showMenuButton?: boolean;
}

const BagTemplateItemView: FC<Props> = ({
  template,
  onDelete,
  divided = false,
  onPress,
  showMenuButton = true,
}) => {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const handlePressDetail = () => {
    router.push({
      pathname: '/bag-template/[id]',
      params: { id: template.getID() },
    });
  };

  const handleDelete = () => {
    setMenuVisible(false);
    app.getAlertManager()?.show({
      message: `${template.getName()} 템플릿을 삭제할까요?`,
      confirmText: '삭제',
      failureMessage: '삭제하지 못했어요. 다시 시도해주세요.',
      onConfirm: async () => onDelete(template),
    });
  };

  return (
    <>
      <View style={[styles.row, divided && styles.divided]}>
        <TouchableOpacity
          style={styles.body}
          onPress={onPress ?? handlePressDetail}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`${template.getName()}, ${template.getWeight()}kg, 장비 ${template.getGearCount()}개`}
        >
          <PretendardText weight='medium' style={styles.name} numberOfLines={2}>
            {template.getName()}
          </PretendardText>
          <PretendardText style={styles.meta} numberOfLines={1}>
            <AcgDisplayText style={styles.metaNumber}>
              {`${template.getWeight()}kg`}
            </AcgDisplayText>
            {` · 장비 ${template.getGearCount()}개`}
          </PretendardText>
        </TouchableOpacity>
        {showMenuButton && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel='템플릿 메뉴'
          >
            <Ionicons name='ellipsis-horizontal' size={16} color={Acg.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {showMenuButton && (
        <BottomMenuModalView
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          menuItems={[
            {
              icon: 'trash-outline',
              text: '삭제',
              onPress: handleDelete,
            },
          ]}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: AcgRow.minHeight,
    flexDirection: 'row',
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
    paddingVertical: AcgRow.paddingVertical,
  },
  name: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  metaNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  menuButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BagTemplateItemView;
