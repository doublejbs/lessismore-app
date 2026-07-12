import { Router } from 'expo-router';
import app from '../app/App';

interface WebViewMessage {
  type: string;
  data?: any;
}

interface WebViewMessageEvent {
  nativeEvent: {
    data: string;
  };
}

export interface WebViewManagerCallback {
  onUpdateData: (data: any) => void;
}

class WebViewManager {
  private static instance: WebViewManager;

  public static getInstance(
    router: Router,
    callback: WebViewManagerCallback = {
      onUpdateData: () => {},
    }
  ): WebViewManager {
    if (!WebViewManager.instance) {
      WebViewManager.instance = new WebViewManager(router, callback);
    }
    return WebViewManager.instance;
  }

  private constructor(
    private readonly router: Router,
    private readonly callback: WebViewManagerCallback
  ) {}

  /**
   * WebView에서 보낸 메시지를 처리하는 메소드
   * @param event - WebView onMessage 이벤트 객체
   */
  public handleMessage = (event: WebViewMessageEvent): void => {
    try {
      const messageData = JSON.parse(event.nativeEvent.data);
      const message: WebViewMessage = messageData;

      console.log('WebView 메시지 수신:', message);

      switch (message.type) {
        case 'CLOSE_WEBVIEW':
          this.handleCloseWebView(message.data);
          break;
        case 'NAVIGATE':
          this.handleNavigate(message.data);
          break;
        case 'UPDATE_DATA':
          this.handleUpdateData(message.data);
          break;
        case 'NAVIGATE_TO_LOGIN':
          this.handleNavigateToLogin(message.data);
          break;
        case 'PAGE_LOADED':
          this.handlePageLoaded(message.data);
          break;
        case 'ERROR':
          this.handleError(message.data);
          break;
        default:
          console.log('알 수 없는 메시지 타입:', message.type);
          break;
      }
    } catch (error) {
      console.error('WebView 메시지 파싱 오류:', error);
    }
  };

  /**
   * WebView 닫기 요청 처리
   */
  private handleCloseWebView = (_data?: any): void => {
    this.router.back();
  };

  /**
   * 네비게이션 요청 처리
   */
  private handleNavigate = (data?: any): void => {
    this.router.push(data.url);
  };

  /**
   * 데이터 업데이트 요청 처리
   */
  private handleUpdateData = (data?: any): void => {
    this.callback.onUpdateData(data);
  };

  /**
   * 로그인 페이지 이동 처리
   */
  private handleNavigateToLogin = (_data?: any): void => {
    app.getLogInAlertManager()?.show();
  };

  /**
   * 페이지 로드 완료 처리
   */
  private handlePageLoaded = (data?: any): void => {
    console.log('WebView 페이지 로드 완료:', data);
  };

  /**
   * 에러 처리
   */
  private handleError = (data?: any): void => {
    // TODO: 실제 구현 필요
    console.error('WebView 에러:', data);
  };
}

export default WebViewManager;
