/**
 * WebView Bridge Script
 * WebView 내부에서 React Native로 메시지를 보내는 브릿지 함수들
 */

(function () {
  'use strict';

  // React Native WebView 브릿지가 사용 가능한지 확인
  if (!window.ReactNativeWebView) {
    console.warn('ReactNativeWebView bridge not available');
    return;
  }

  /**
   * React Native로 메시지를 보내는 기본 함수
   * @param {string} type - 메시지 타입
   * @param {any} data - 전송할 데이터
   */
  function sendMessage(type, data = null) {
    try {
      const message = JSON.stringify({ type, data });
      window.ReactNativeWebView.postMessage(message);
      console.log('Message sent to React Native:', { type, data });
    } catch (error) {
      console.error('Failed to send message to React Native:', error);
    }
  }

  /**
   * WebView 닫기 요청
   * @param {any} data - 추가 데이터 (선택적)
   */
  function closeWebView(data = null) {
    sendMessage('CLOSE_WEBVIEW', data);
  }

  /**
   * 네비게이션 요청
   * @param {string} url - 이동할 URL 또는 라우트
   * @param {any} params - 추가 파라미터 (선택적)
   */
  function navigate(url, params = null) {
    sendMessage('NAVIGATE', { url, params });
  }

  /**
   * 데이터 업데이트 요청
   * @param {any} data - 업데이트할 데이터
   */
  function updateData(data) {
    sendMessage('UPDATE_DATA', data);
  }

  function navigateToLogin() {
    sendMessage('NAVIGATE_TO_LOGIN');
  }

  /**
   * 에러 리포트
   * @param {string} message - 에러 메시지
   * @param {any} details - 에러 상세 정보 (선택적)
   */
  function reportError(message, details = null) {
    sendMessage('ERROR', { message, details });
  }

  /**
   * 사용자 정의 메시지 전송
   * @param {string} type - 메시지 타입
   * @param {any} data - 전송할 데이터
   */
  function sendCustomMessage(type, data) {
    sendMessage(type, data);
  }

  // 전역 객체에 브릿지 함수들을 등록
  window.NativeBridge = {
    closeWebView,
    navigate,
    updateData,
    reportError,
    sendCustomMessage,
    // 직접 사용할 수도 있도록 노출
    sendMessage,
    navigateToLogin,
  };

  // 페이지가 로드되었음을 알림
  document.addEventListener('DOMContentLoaded', function () {
    console.log('NativeBridge initialized');

    // 선택적: 페이지 로드 완료를 React Native에 알림
    sendMessage('PAGE_LOADED', {
      url: window.location.href,
      title: document.title,
    });
  });

  // 에러 캐치 및 자동 리포트
  window.addEventListener('error', function (event) {
    reportError('JavaScript Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error ? event.error.stack : null,
    });
  });

  // Promise rejection 에러 캐치
  window.addEventListener('unhandledrejection', function (event) {
    reportError('Unhandled Promise Rejection', {
      reason: event.reason,
      stack: event.reason && event.reason.stack ? event.reason.stack : null,
    });
  });
})();
