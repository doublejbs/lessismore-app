import { FC, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GearEditView from '@/components/gear/edit/GearEditView';
import GearEditDispatcher from '@/model/gear/edit/GearEditDispatcher';
import GearEdit from '@/model/gear/edit/GearEdit';
import CustomGearCategory from '@/model/gear/custom/CustomGearCategory';
import { observer } from 'mobx-react-lite';

interface Props {}

const GearEditWrapper: FC<Props> = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gearEdit] = useState(() =>
    GearEdit.from(GearEditDispatcher.new(), router, CustomGearCategory.new())
  );
  const isInitialized = gearEdit.isInitialized();

  useEffect(() => {
    if (id) {
      gearEdit.initialize(id);
    }
  }, [id, gearEdit]);

  if (isInitialized) {
    return <GearEditView gearEdit={gearEdit} />;
  } else {
    return null;
  }
};

export default observer(GearEditWrapper);
