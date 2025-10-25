import { observer } from 'mobx-react-lite';
import SearchWarehouseView from '@/components/search/SearchWarehouseView';
import { useState } from 'react';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import { useRouter } from 'expo-router';
import AlertView from '@/components/alert/AlertView';
import app from '@/model/app/App';
import LogInView from '@/components/login/LogInView';

const SearchPage = () => {
  const router = useRouter();
  const [searchWarehouse] = useState(() => SearchWarehouse.new(router));

  return (
    <>
      <SearchWarehouseView searchWarehouse={searchWarehouse} />
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
    </>
  );
};

export default observer(SearchPage);
