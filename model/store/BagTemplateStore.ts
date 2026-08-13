import { makeAutoObservable } from 'mobx';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Dayjs } from 'dayjs';
import Firebase from '@/model/firebase/Firebase';
import BagTemplate from '@/model/bag/BagTemplate';
import app from '@/model/app/App';
import Gear from '@/model/gear/Gear';
import GearStore from '@/model/store/GearStore';

class BagTemplateStore {
  public constructor(
    private readonly firebase: Firebase,
    private readonly gearStore: GearStore
  ) {
    makeAutoObservable(this);
  }

  public async getList(): Promise<BagTemplate[]> {
    const userId = this.getUserID();

    if (!userId) {
      return [];
    }

    const snapshot = await getDocs(this.getCollection());
    const templates = snapshot.docs.map(snapshotDoc => {
      const data = snapshotDoc.data();

      return BagTemplate.from(snapshotDoc.id, {
        name: String(data.name ?? ''),
        weight: Number(data.weight ?? 0),
        gears: Array.isArray(data.gears) ? data.gears : [],
        createdAt: String(data.createdAt ?? ''),
        editDate: String(data.editDate ?? ''),
      });
    });

    return templates.sort(
      (left, right) =>
        right.getCreatedAt().valueOf() - left.getCreatedAt().valueOf()
    );
  }

  public async saveFromBag(id: string, name: string) {
    const bagSnapshot = await getDoc(doc(this.getStore(), 'bag', id));

    if (!bagSnapshot.exists()) {
      throw new Error('Bag document does not exist!');
    }

    const bagData = bagSnapshot.data();
    const now = new Date().toISOString();

    const templateSnapshot = await addDoc(this.getCollection(), {
      name,
      gears: Array.isArray(bagData.gears) ? bagData.gears : [],
      weight: Number(bagData.weight ?? 0),
      createdAt: now,
      editDate: now,
    });

    return templateSnapshot.id;
  }

  public async delete(id: string) {
    await deleteDoc(doc(this.getCollection(), id));
  }

  public async get(id: string) {
    const snapshot = await getDoc(doc(this.getCollection(), id));

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();

    return BagTemplate.from(snapshot.id, {
      name: String(data.name ?? ''),
      weight: Number(data.weight ?? 0),
      gears: Array.isArray(data.gears) ? data.gears : [],
      createdAt: String(data.createdAt ?? ''),
      editDate: String(data.editDate ?? ''),
    });
  }

  public async getGears(template: BagTemplate): Promise<Gear[]> {
    const gears = await Promise.all(
      Array.from(new Set(template.getGearIDs())).map(gearID =>
        this.gearStore.getUserGear(gearID)
      )
    );

    return gears.filter((gear): gear is Gear => gear !== null);
  }

  public async getEditData(id: string) {
    const template = await this.get(id);

    if (!template) {
      return null;
    }

    return {
      template,
      gears: await this.getGears(template),
    };
  }

  public async updateName(id: string, name: string) {
    await updateDoc(doc(this.getCollection(), id), {
      name,
      editDate: new Date().toISOString(),
    });
  }

  public async updateGears(id: string, gears: Gear[]) {
    const now = new Date().toISOString();
    const weight = gears.reduce(
      (total, gear) => total + Number(gear.getWeight() || 0),
      0
    );

    await updateDoc(doc(this.getCollection(), id), {
      gears: gears.map(gear => gear.getId()),
      weight,
      editDate: now,
    });
  }

  public async createBag(
    template: BagTemplate,
    name: string,
    startDate: Dayjs,
    endDate: Dayjs
  ) {
    const gearIDs = Array.from(new Set(template.getGearIDs()));
    const gearRefs = gearIDs.map(gearID =>
      doc(this.getStore(), 'users', this.getUserID(), 'gears', gearID)
    );
    const gearSnapshots = await Promise.all(gearRefs.map(gearRef => getDoc(gearRef)));
    const existingGearEntries = gearIDs
      .map((gearID, index) => ({ gearID, gearRef: gearRefs[index], snapshot: gearSnapshots[index] }))
      .filter(entry => entry.snapshot.exists());
    const existingGearIDs = existingGearEntries.map(entry => entry.gearID);
    const weight = gearSnapshots.reduce((sum, gearSnapshot) => {
      if (!gearSnapshot.exists()) {
        return sum;
      }

      return sum + (Number(gearSnapshot.data().weight) || 0);
    }, 0);
    const now = new Date().toISOString();
    const batch = writeBatch(this.getStore());
    const bagRef = doc(collection(this.getStore(), 'bag'));

    batch.set(bagRef, {
      name,
      weight,
      gears: existingGearIDs,
      editDate: now,
      createdAt: now,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      shared: false,
      userId: this.getUserID(),
    });

    existingGearEntries.forEach(entry => {
      batch.update(entry.gearRef, {
        bags: arrayUnion(bagRef.id),
      });
    });

    batch.update(doc(this.getStore(), 'users', this.getUserID()), {
      bags: arrayUnion(bagRef.id),
    });

    await batch.commit();

    void app
      .getNotificationManager()
      ?.scheduleBagReminders(bagRef.id, name, startDate, endDate);

    return bagRef.id;
  }

  private getCollection() {
    return collection(this.getStore(), 'users', this.getUserID(), 'bagTemplates');
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserID() {
    return this.firebase.getUserId();
  }
}

export default BagTemplateStore;
