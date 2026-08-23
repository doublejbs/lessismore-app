import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore';

const config = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
  measurementId: 'G-NC0J0766BX',
};

// gear ID와 카테고리 정보를 함께 저장하는 타입
interface GearRankData {
  count: number;
  category: string;
}

async function migrateGearRank() {
  try {
    // Firebase 초기화
    const app = initializeApp(config);
    const db = getFirestore(app);

    console.log('장비 랭킹 데이터 마이그레이션 시작...'); // l10n-ignore: 개발자 로그

    // users 컬렉션의 모든 사용자 가져오기
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`총 ${usersSnapshot.size}명의 사용자를 찾았습니다.`); // l10n-ignore: 개발자 로그

    // gear-rank 컬렉션에 추가할 gear ID와 카테고리 정보 추적
    const gearRankMap = new Map<string, GearRankData>();
    let totalGearsProcessed = 0;
    let customGearsSkipped = 0;

    // 각 사용자의 gears 순회
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`\n사용자 ${userId}의 장비 처리 중...`); // l10n-ignore: 개발자 로그

      // 사용자의 gears 서브컬렉션 가져오기
      const gearsSnapshot = await getDocs(
        collection(db, 'users', userId, 'gears')
      );

      console.log(`  - ${gearsSnapshot.size}개의 장비 발견`); // l10n-ignore: 개발자 로그

      for (const gearDoc of gearsSnapshot.docs) {
        const gearData = gearDoc.data();
        const gearId = gearData.id || gearDoc.id;
        const category = gearData.category;

        totalGearsProcessed++;

        // isCustom이 false인 경우만 처리
        if (gearData.isCustom === false) {
          // 이미 카운트된 gear ID라면 카운트 증가
          const existingData = gearRankMap.get(gearId);
          if (existingData) {
            existingData.count += 1;
          } else {
            // 새로운 gear ID라면 카테고리 정보와 함께 추가
            gearRankMap.set(gearId, {
              count: 1,
              category: category || '기타', // l10n-ignore: 카테고리 캐노니컬 기본값
            });
          }
        } else {
          customGearsSkipped++;
        }
      }
    }

    console.log(`\n총 ${totalGearsProcessed}개의 장비 처리 완료`); // l10n-ignore: 개발자 로그
    console.log(`커스텀 장비 ${customGearsSkipped}개 스킵`); // l10n-ignore: 개발자 로그
    console.log(`gear-rank에 추가할 장비 ${gearRankMap.size}개`); // l10n-ignore: 개발자 로그

    // gear-rank 컬렉션에 데이터 저장
    console.log('\ngear-rank 컬렉션에 데이터 저장 중...'); // l10n-ignore: 개발자 로그

    // Batch 작업으로 효율적으로 저장
    let batch = writeBatch(db);
    let batchCount = 0;
    let totalSaved = 0;

    for (const [gearId, rankData] of gearRankMap.entries()) {
      const gearRankRef = doc(db, 'gear-rank', gearId);

      batch.set(gearRankRef, {
        id: gearId,
        count: rankData.count,
        category: rankData.category,
        updatedAt: new Date(),
      });

      batchCount++;
      totalSaved++;

      // Firestore batch는 최대 500개까지만 가능
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`  - ${totalSaved}개 저장됨...`); // l10n-ignore: 개발자 로그
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n✅ 마이그레이션 완료!`); // l10n-ignore: 개발자 로그
    console.log(
      `총 ${totalSaved}개의 장비가 gear-rank 컬렉션에 저장되었습니다.` // l10n-ignore: 개발자 로그
    );

    // 카테고리별 통계 출력
    const categoryStats = new Map<string, number>();
    for (const [, rankData] of gearRankMap.entries()) {
      const count = categoryStats.get(rankData.category) || 0;
      categoryStats.set(rankData.category, count + 1);
    }

    console.log('\n📊 카테고리별 장비 수:'); // l10n-ignore: 개발자 로그
    for (const [category, count] of categoryStats.entries()) {
      console.log(`  - ${category}: ${count}개`); // l10n-ignore: 개발자 로그
    }
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error); // l10n-ignore: 개발자 로그
    throw error;
  }
}

// 스크립트 실행
migrateGearRank()
  .then(() => {
    console.log('\n스크립트 실행 완료'); // l10n-ignore: 개발자 로그
    process.exit(0);
  })
  .catch(error => {
    console.error('\n스크립트 실행 실패:', error); // l10n-ignore: 개발자 로그
    process.exit(1);
  });
