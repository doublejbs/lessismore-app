// 검색 필드의 두 세대. `Glass`(기본)는 ACG 유리 면이고, `Plain`은 레퍼런스 탐색 화면의
// 연회색 알약(테두리·유리·그림자 없음)이다. 탐색 탭만 `Plain`을 쓰고,
// 장비 추가 검색 시트는 기존 `Glass`를 유지한다.
enum SearchBarVariant {
  Glass = 'glass',
  Plain = 'plain',
}

export default SearchBarVariant;
