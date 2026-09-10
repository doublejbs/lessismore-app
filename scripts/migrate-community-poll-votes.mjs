import { readFileSync, writeFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const keyIndex = args.indexOf('--key');
const keyPath = keyIndex >= 0 ? args[keyIndex + 1] : undefined;
const apply = args.includes('--apply');

if (!keyPath) {
  throw new Error('서비스 계정 키를 --key <serviceAccountJson>으로 지정하세요.'); // l10n-ignore: 개발자 오류
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
const firebaseApp = initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore(firebaseApp);
const snapshot = await firestore.collection('community-poll-votes').get();

const serialize = value => {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(item => serialize(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serialize(item)])
    );
  }

  return value;
};

const documents = snapshot.docs.map(document => ({
  id: document.id,
  data: serialize(document.data()),
}));
const targets = snapshot.docs.filter(document => {
  const data = document.data();

  return typeof data.optionId === 'string' && !Array.isArray(data.optionIds);
});
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const backupPath = `scripts/backup-community-poll-votes-${timestamp}.json`;

writeFileSync(backupPath, JSON.stringify(documents, null, 2));
console.log(`모드: ${apply ? 'APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}`); // l10n-ignore: 개발자 로그
console.log(`/community-poll-votes 총 문서: ${documents.length}개`); // l10n-ignore: 개발자 로그
console.log(`마이그레이션 대상: ${targets.length}개`); // l10n-ignore: 개발자 로그
console.log(`백업 저장: ${backupPath}`); // l10n-ignore: 개발자 로그

if (!apply) {
  console.log('DRY-RUN 종료. 실제 적용하려면 --apply 플래그를 붙이세요.'); // l10n-ignore: 개발자 로그
} else {
  for (let index = 0; index < targets.length; index += 450) {
    const batch = firestore.batch();
    const chunk = targets.slice(index, index + 450);

    chunk.forEach(document => {
      batch.update(document.ref, {
        optionIds: [document.data().optionId],
        optionId: FieldValue.delete(),
      });
    });

    await batch.commit();
    console.log(`적용: ${Math.min(index + chunk.length, targets.length)}/${targets.length}`); // l10n-ignore: 개발자 로그
  }

  console.log('✅ 커뮤니티 투표 문서 마이그레이션 완료'); // l10n-ignore: 개발자 로그
}
