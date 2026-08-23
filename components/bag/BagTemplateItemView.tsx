import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
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
      message: app.getL10n().t('bag.template.deleteConfirm', { name: template.getName() }),
      confirmText: app.getL10n().t('common.delete'),
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
      accessibilityLabel={`${template.getName()}, ${template.getWeight()}kg, ${app.getL10n().t('bagDetail.gearCount', { count: template.getGearCount() })}`}
        >
          <PretendardText weight='medium' style={styles.name} numberOfLines={2}>
            {template.getName()}
          </PretendardText>
          <PretendardText style={styles.meta} numberOfLines={1}>
            <AcgDisplayText style={styles.metaNumber}>
              {`${template.getWeight()}kg`}
            </AcgDisplayText>
          {` · ${app.getL10n().t('bagDetail.gearCount', { count: template.getGearCount() })}`}
          </PretendardText>
        </TouchableOpacity>
        {showMenuButton && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
            accessibilityRole='button'
      accessibilityLabel={app.getL10n().t('bag.template.menu')}
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
        text: app.getL10n().t('common.delete'),
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

export default observer(BagTemplateItemView);
