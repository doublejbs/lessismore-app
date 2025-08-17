import { observer } from 'mobx-react-lite';
import WebViewWrapper from '@/components/webview/WebViewWrapper';
import { Platform } from 'react-native';

const SearchPage = () => {
  return (
    <WebViewWrapper
      uri={`https://useless.my/search`}
      header={false}
      modal={Platform.OS === 'ios'}
    />
  );
};

export default observer(SearchPage);
