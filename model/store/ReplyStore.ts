import { doc, getDoc } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';

class ReplyStore {
  public constructor(private readonly firebase: Firebase) {}

  public async getReplies(gearId: string) {
    const reply = await getDoc(doc(this.getStore(), 'reply', gearId));

    if (reply.exists()) {
      return reply.data();
    } else {
      return [];
    }
  }

  private getStore() {
    return this.firebase.getStore();
  }
}

export default ReplyStore;
