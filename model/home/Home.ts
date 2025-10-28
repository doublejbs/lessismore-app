import { makeAutoObservable } from 'mobx';
import Firebase from '../firebase/Firebase';
import app from '../app/App';

class Home {
  public static new() {
    return new Home(app.getFirebase());
  }

  private initialized = false;
  private nickname = '';

  private constructor(private readonly firebase: Firebase) {
    makeAutoObservable(this);
  }

  public async initialize() {
    this.setNickname(this.firebase.getNickname());
    this.setInitialized(true);
  }

  public isInitialized() {
    return this.initialized;
  }

  public getNickname() {
    return this.nickname;
  }

  private setInitialized(initialized: boolean) {
    this.initialized = initialized;
  }

  private setNickname(nickname: string) {
    this.nickname = nickname;
  }
}

export default Home;
