import { observer } from 'mobx-react-lite';
import WebViewWrapper from '@/components/webview/WebViewWrapper';

const SearchPage = () => {
  return <WebViewWrapper uri={`https://useless.my/search`} header={false} />;
};

export default observer(SearchPage);
