import NotLogInWebViewWrapper from '@/components/webview/NotLogInWebViewWrapper';
import { observer } from 'mobx-react-lite';
import { Platform } from 'react-native';

const NotLoginSearchPage = () => {
  const uri = `https://useless.my/search`;

  return (
    <NotLogInWebViewWrapper
      uri={uri}
      header={false}
      modal={Platform.OS === 'ios'}
    />
  );
};

export default observer(NotLoginSearchPage);
