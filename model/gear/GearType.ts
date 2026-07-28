interface GearType {
    id: string;
    name: string;
    company: string;
    weight: string;
    category?: string;
    useless: string[];
    used: string[];
    bags: string[];
    createDate: number;
    color: string;
    companyKorean: string;
    nameKorean: string;
    colorKorean?: string;
    size?: string;
    sizeKorean?: string;
    groupId?: string;
    specs?: Record<string, string | number | boolean>;
  }
  
  export default GearType;
  