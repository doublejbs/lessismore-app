import { observer } from 'mobx-react-lite';
import WebViewWrapper from '@/components/webview/WebViewWrapper';
import { Platform } from 'react-native';
import Order from '@/model/order/Order';
import Warehouse from '@/model/warehouse/Warehouse';

const SearchPage = () => {
  const handleUpdateData = () => {
    Order.new(Warehouse.ORDER_KEY).selectLastOrderOption();
  };

  return (
    <WebViewWrapper
      uri={'https://useless.my/search'}
      header={false}
      modal={Platform.OS === 'ios'}
      callback={{
        onUpdateData: handleUpdateData,
      }}
    />
  );
};

export default observer(SearchPage);
