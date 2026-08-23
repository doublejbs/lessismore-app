/**
 * 브랜드 링크(GD-5) 라벨 계산.
 *
 * `productUrl`이 **브랜드 공식몰인지 편집숍인지** 가려서 라벨을 정한다. 실데이터에서
 * 23개 도메인 중 21개는 호스트에 브랜드 슬러그(`company`)가 그대로 들어 있어 공식몰임이
 * 드러나지만, 최다 도메인인 더 기어샵(11,806건·31%)은 아크테릭스·스카르파 등을 함께 파는
 * 편집숍이다. 여기에 `아크테릭스 공식몰에서 보기`라고 쓰면 사실이 아니다.
 */

/** 비교용 정규화 — 대소문자·하이픈·점을 지운다. `black-diamond` → `blackdiamond`. */
import app from '@/model/app/App';

const normalize = (value: string | undefined): string =>
  (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** `https://m.backcountry.co.kr/...` → `m.backcountry.co.kr`. 파싱 실패 시 null. */
export const getLinkHost = (url: string | undefined): string | null => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
};

/** 표시용 호스트 — `www.`/`m.` 서브도메인은 뗀다. */
export const getDisplayHost = (url: string | undefined): string | null => {
  const host = getLinkHost(url);

  return host ? host.replace(/^(www|m)\./, '') : null;
};

/**
 * 링크 대상이 그 브랜드의 공식몰인지 판정한다.
 *
 * 호스트에서 TLD와 서브도메인을 걷어낸 뒤 브랜드 슬러그가 들어 있는지만 본다.
 * 슬러그가 약어라 못 맞히는 경우(예: `hmg` vs `hyperlitemountaingear.co.kr`)는
 * 공식몰인데도 false가 되는데, 그쪽이 안전한 방향이라 그대로 둔다 —
 * 편집숍을 공식몰이라 부르는 것보다 공식몰을 중립적으로 부르는 편이 낫다.
 */
export const isBrandOfficialUrl = (
  url: string | undefined,
  companySlug: string | undefined
): boolean => {
  const host = getLinkHost(url);
  const slug = normalize(companySlug);

  if (!host || !slug) {
    return false;
  }

  const hostKey = normalize(
    host.replace(/^(www|m)\./, '').replace(/\.(co\.kr|com|kr|net|global)$/, '')
  );

  return hostKey.includes(slug);
};

/**
 * 브랜드 링크 라벨.
 *
 * - 공식몰: `아크테릭스 공식몰에서 보기`
 * - 그 외: `thegearshop.co.kr에서 보기` — 어디로 가는지는 알려주되 공식몰이라 하지 않는다.
 */
export const getBrandLinkLabel = (
  url: string | undefined,
  companySlug: string | undefined,
  companyName: string | undefined
): string => {
  if (isBrandOfficialUrl(url, companySlug)) {
    return companyName
      ? app.getL10n().t('gearDetail.brandOfficial', { company: companyName })
      : app.getL10n().t('gearDetail.officialStore');
  }

  const host = getDisplayHost(url);

  return host
    ? app.getL10n().t('gearDetail.hostLink', { host })
    : app.getL10n().t('gearDetail.productPage');
};
