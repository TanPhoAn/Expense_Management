export interface SuggestionMatch {
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  confidence: number;
}

const VIETNAMESE_KEYWORD_MAP: Array<{
  keywords: string[];
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
}> = [
  {
    keywords: [
      'an uong',
      'an trua',
      'an toi',
      'an sang',
      'an',
      'com',
      'pho',
      'bun',
      'ca phe',
      'cafe',
      'coffee',
      'tra sua',
      'nha hang',
      'quan an',
    ],
    categoryName: 'Ăn uống',
    type: 'EXPENSE',
  },
  {
    keywords: [
      'xang',
      'grab',
      'be',
      'gojek',
      'xe buyt',
      'gui xe',
      'rua xe',
      'bao duong',
      've tau',
      'may bay',
      'taxi',
    ],
    categoryName: 'Di chuyển',
    type: 'EXPENSE',
  },
  {
    keywords: [
      'shopee',
      'lazada',
      'tiki',
      'mua sam',
      'quan ao',
      'giay',
      'sieu thi',
      'bach hoa',
      'tieu dung',
    ],
    categoryName: 'Mua sắm',
    type: 'EXPENSE',
  },
  {
    keywords: [
      'dien',
      'nuoc',
      'internet',
      'wifi',
      'tien nha',
      'chung cu',
      'rac',
      'truyen hinh',
      'phi quan ly',
    ],
    categoryName: 'Hóa đơn & Tiện ích',
    type: 'EXPENSE',
  },
  {
    keywords: [
      'thuoc',
      'benh vien',
      'kham',
      'nha khoa',
      'bac si',
      'vitamin',
      'hieu thuoc',
    ],
    categoryName: 'Sức khỏe',
    type: 'EXPENSE',
  },
  {
    keywords: [
      'xem phim',
      'phim',
      'cgv',
      'netflix',
      'spotify',
      'game',
      'gaming',
      'concert',
      'ca nhac',
      'du lich',
      'khach san',
      've xem phim',
      'rap',
      'karaoke',
    ],
    categoryName: 'Giải trí',
    type: 'EXPENSE',
  },
  {
    keywords: [
      'hoc phi',
      'sach',
      'khoa hoc',
      'tieng anh',
      'vo',
      'dai hoc',
      'truong',
    ],
    categoryName: 'Giáo dục',
    type: 'EXPENSE',
  },
  {
    keywords: ['luong', 'salary', 'thu nhap', 'tam ung'],
    categoryName: 'Lương',
    type: 'INCOME',
  },
  {
    keywords: ['thuong', 'bonus', 'hoa hong', 'qua tang'],
    categoryName: 'Thưởng',
    type: 'INCOME',
  },
  {
    keywords: ['lai', 'co tuc', 'chung khoan', 'tiet kiem', 'crypto', 'loi nhuan'],
    categoryName: 'Đầu tư',
    type: 'INCOME',
  },
];

/**
 * Remove Vietnamese accents and normalize string for robust matching.
 */
export function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Suggest a category based on the description text using whole-syllable or exact phrase boundaries.
 * Longer, more specific keywords are matched first (e.g. "du an" or "thuong du an" before single syllable "an").
 */
export function suggestCategoryFromDescription(description: string): SuggestionMatch | null {
  if (!description || description.trim().length === 0) return null;

  const normalizedInput = ` ${normalizeVietnamese(description).replace(/[^\w\s]/g, ' ')} `;

  // Flatten all keywords with category reference and sort by length descending
  const allCandidates: Array<{
    kw: string;
    categoryName: string;
    type: 'INCOME' | 'EXPENSE';
  }> = [];

  for (const mapping of VIETNAMESE_KEYWORD_MAP) {
    for (const kw of mapping.keywords) {
      allCandidates.push({
        kw,
        categoryName: mapping.categoryName,
        type: mapping.type,
      });
    }
  }

  // Prioritize longer phrases (e.g. "an trua" before "an", "thuong" before "an" inside "du an")
  allCandidates.sort((a, b) => b.kw.length - a.kw.length);

  for (const candidate of allCandidates) {
    const paddedKw = ` ${candidate.kw} `;
    if (normalizedInput.includes(paddedKw)) {
      return {
        categoryName: candidate.categoryName,
        type: candidate.type,
        confidence: 0.9,
      };
    }
  }

  return null;
}
