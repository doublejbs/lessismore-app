import AsyncStorage from '@react-native-async-storage/async-storage';

class LocalStorageManager {
  /**
   * 로컬 스토리지에 값을 저장합니다.
   * @param key 저장할 키
   * @param value 저장할 값
   */
  public static async set<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('LocalStorageManager.set error:', error);
    }
  }

  /**
   * 로컬 스토리지에서 값을 가져옵니다.
   * @param key 가져올 키
   * @returns 저장된 값 또는 null
   */
  public static async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('LocalStorageManager.get error:', error);
      return null;
    }
  }

  /**
   * 로컬 스토리지에서 값을 제거합니다.
   * @param key 제거할 키
   */
  public static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorageManager.remove error:', error);
    }
  }

  /**
   * 로컬 스토리지를 모두 비웁니다.
   */
  public static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('LocalStorageManager.clear error:', error);
    }
  }

  /**
   * 로컬 스토리지의 모든 키를 가져옵니다.
   * @returns 모든 키의 배열
   */
  public static async getAllKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('LocalStorageManager.getAllKeys error:', error);
      return [];
    }
  }
}

export default LocalStorageManager;
