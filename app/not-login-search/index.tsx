import NotLogInWebViewWrapper from '@/components/webview/NotLogInWebViewWrapper';
import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { Platform } from 'react-native';

const NotLoginSearchPage: FC = () => {
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
