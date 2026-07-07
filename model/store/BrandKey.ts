export const toBrandKey = (companyKorean?: string, company?: string): string => {
  const source = companyKorean || company;

  if (!source) {
    return '';
  }

  return String(source).trim().toLowerCase();
};
