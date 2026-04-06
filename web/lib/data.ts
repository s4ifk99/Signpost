import legalAidListingsRaw from "@/data/legal-aid-listings.json";

export const categories = {
  "Free Legal Help": [
    { name: "Citizens Advice", slug: "citizens-advice", free: true },
    { name: "Law Centres", slug: "law-centres", free: true },
    { name: "Legal Aid Checker", slug: "legal-aid-checker", free: true },
    { name: "Pro Bono Clinics", slug: "pro-bono-clinics", free: true },
    { name: "AdviceNow Guides", slug: "advicenow-guides", free: true },
    { name: "Shelter (Housing)", slug: "shelter-housing", free: true },
    { name: "StepChange (Debt)", slug: "stepchange-debt", free: true },
    { name: "Release (Drug Law)", slug: "release-drug-law", free: true },
  ],
  "Criminal Defence": [
    { name: "Criminal Defence", slug: "criminal-defence" },
    { name: "Drink Driving", slug: "drink-driving" },
    { name: "Drug Offences", slug: "drug-offences" },
    { name: "Fraud & Financial Crime", slug: "fraud-financial-crime" },
    { name: "Motoring Offences", slug: "motoring-offences" },
    { name: "Youth Court", slug: "youth-court" },
    { name: "Appeals", slug: "appeals" },
    { name: "Crown Court", slug: "crown-court" },
  ],
  "Personal Injury": [
    { name: "Personal Injury", slug: "personal-injury" },
    { name: "Road Traffic Accidents", slug: "road-traffic-accidents" },
    { name: "Clinical Negligence", slug: "clinical-negligence" },
    { name: "Workplace Accidents", slug: "workplace-accidents" },
    { name: "Slip & Trip Claims", slug: "slip-trip-claims" },
    { name: "Product Liability", slug: "product-liability" },
    { name: "Fatal Accidents", slug: "fatal-accidents" },
    { name: "Industrial Disease", slug: "industrial-disease" },
  ],
  "Intellectual Property": [
    { name: "Patents", slug: "patents" },
    { name: "Trade Marks", slug: "trade-marks" },
    { name: "Copyright", slug: "copyright" },
    { name: "Trade Secrets", slug: "trade-secrets" },
    { name: "IP Litigation", slug: "ip-litigation" },
    { name: "Licensing", slug: "licensing" },
    { name: "Data Protection", slug: "data-protection" },
    { name: "Media & Entertainment", slug: "media-entertainment" },
  ],
  "Debt & Insolvency": [
    { name: "Bankruptcy", slug: "bankruptcy" },
    { name: "Debt Recovery", slug: "debt-recovery" },
    { name: "Tax Disputes", slug: "tax-disputes" },
    { name: "HMRC Investigations", slug: "hmrc-investigations" },
    { name: "Consumer Rights", slug: "consumer-rights" },
    { name: "IVAs", slug: "ivas" },
    { name: "CCJs", slug: "ccjs" },
    { name: "Debt Management", slug: "debt-management" },
  ],
  "Public & Human Rights": [
    { name: "Human Rights", slug: "human-rights" },
    { name: "Judicial Review", slug: "judicial-review" },
    { name: "Benefits Appeals", slug: "benefits-appeals" },
    { name: "Housing & Homelessness", slug: "housing-homelessness" },
    { name: "Education Law", slug: "education-law" },
    { name: "Community Care", slug: "community-care" },
    { name: "Mental Health Law", slug: "mental-health-law" },
    { name: "Public Inquiries", slug: "public-inquiries" },
  ],
  "Military & Armed Forces": [
    { name: "Courts Martial", slug: "courts-martial" },
    { name: "Service Complaints", slug: "service-complaints" },
    { name: "Veterans Rights", slug: "veterans-rights" },
    { name: "Armed Forces Compensation", slug: "armed-forces-compensation" },
    { name: "Military Pensions", slug: "military-pensions" },
    { name: "Discharge Appeals", slug: "discharge-appeals" },
    { name: "PTSD Claims", slug: "ptsd-claims" },
    { name: "War Pensions", slug: "war-pensions" },
  ],
  "Consumer & Regulatory": [
    { name: "Consumer Disputes", slug: "consumer-disputes" },
    { name: "Trading Standards", slug: "trading-standards" },
    { name: "Financial Ombudsman", slug: "financial-ombudsman" },
    { name: "Professional Negligence", slug: "professional-negligence" },
    { name: "Regulatory Defence", slug: "regulatory-defence" },
    { name: "Health & Safety", slug: "health-safety" },
    { name: "Environmental Law", slug: "environmental-law" },
    { name: "Licensing & Permits", slug: "licensing-permits" },
  ],
};

export type Listing = {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postcode: string;
  category: string;
  subcategory: string;
  description: string;
  website?: string;
  isFree: boolean;
  isSponsored: boolean;
  isLegalAid?: boolean;
  /** GOV.UK directory area-of-law label (legal-aid ingest only); improves search text. */
  legalAidGovCategory?: string;
};

// Sample listings data - in production this would come from a database
export const listings: Listing[] = [
  // Free Legal Help - Citizens Advice
  {
    id: "1",
    businessName: "Citizens Advice Bureau - London",
    contactName: "Advice Team",
    phone: "0800 144 8848",
    email: "advice@citizensadvice.org.uk",
    address: "200 Aldersgate Street",
    city: "London",
    postcode: "EC1A 4HD",
    category: "Free Legal Help",
    subcategory: "citizens-advice",
    description: "Free, confidential advice on legal, financial, and other problems. Walk-in and telephone services available.",
    website: "https://www.citizensadvice.org.uk",
    isFree: true,
    isSponsored: false,
  },
  {
    id: "2",
    businessName: "Citizens Advice Manchester",
    contactName: "Help Desk",
    phone: "0808 278 7801",
    email: "manchester@citizensadvice.org.uk",
    address: "St Nicholas Building, 31 Oldham Street",
    city: "Manchester",
    postcode: "M1 1JG",
    category: "Free Legal Help",
    subcategory: "citizens-advice",
    description: "Free advice service covering benefits, debt, housing, employment and family issues.",
    website: "https://www.citizensadvicemanchester.org.uk",
    isFree: true,
    isSponsored: false,
  },
  {
    id: "3",
    businessName: "Citizens Advice Birmingham",
    contactName: "Enquiries",
    phone: "0344 477 1010",
    email: "info@bcabs.org.uk",
    address: "Ground Floor, Gazette Buildings",
    city: "Birmingham",
    postcode: "B4 6AT",
    category: "Free Legal Help",
    subcategory: "citizens-advice",
    description: "Comprehensive free advice service for Birmingham residents on all civil legal matters.",
    isFree: true,
    isSponsored: false,
  },
  // Free Legal Help - Law Centres
  {
    id: "4",
    businessName: "Hackney Law Centre",
    contactName: "Reception",
    phone: "020 8985 8364",
    email: "info@hackneylawcentre.org.uk",
    address: "8 Lower Clapton Road",
    city: "London",
    postcode: "E5 0PD",
    category: "Free Legal Help",
    subcategory: "law-centres",
    description: "Free legal advice and representation for Hackney residents in housing, employment, immigration, and welfare benefits.",
    website: "https://www.hackneylawcentre.org.uk",
    isFree: true,
    isSponsored: false,
  },
  {
    id: "5",
    businessName: "Greater Manchester Law Centre",
    contactName: "Advice Line",
    phone: "0161 769 2244",
    email: "admin@gmlaw.org.uk",
    address: "Heron House, 47 Lloyd Street",
    city: "Manchester",
    postcode: "M2 5LE",
    category: "Free Legal Help",
    subcategory: "law-centres",
    description: "Free specialist legal advice for people in Greater Manchester on housing, debt, and welfare benefits.",
    website: "https://www.gmlaw.org.uk",
    isFree: true,
    isSponsored: false,
  },
  // Free Legal Help - Shelter
  {
    id: "6",
    businessName: "Shelter England",
    contactName: "Housing Helpline",
    phone: "0808 800 4444",
    email: "info@shelter.org.uk",
    address: "88 Old Street",
    city: "London",
    postcode: "EC1V 9HU",
    category: "Free Legal Help",
    subcategory: "shelter-housing",
    description: "Free expert housing advice and support. Help with homelessness, eviction, repairs, and housing rights.",
    website: "https://www.shelter.org.uk",
    isFree: true,
    isSponsored: false,
  },
  // Free Legal Help - StepChange
  {
    id: "7",
    businessName: "StepChange Debt Charity",
    contactName: "Debt Advice Team",
    phone: "0800 138 1111",
    email: "help@stepchange.org",
    address: "Wade House, Merrion Centre",
    city: "Leeds",
    postcode: "LS2 8NG",
    category: "Free Legal Help",
    subcategory: "stepchange-debt",
    description: "Free, impartial debt advice and solutions including debt management plans, IVAs, and bankruptcy guidance.",
    website: "https://www.stepchange.org",
    isFree: true,
    isSponsored: false,
  },
  // Criminal Defence
  {
    id: "8",
    businessName: "Burton Copeland Solicitors",
    contactName: "Criminal Team",
    phone: "0161 827 9500",
    email: "crime@burtoncopeland.com",
    address: "51 Lincoln's Inn Fields",
    city: "London",
    postcode: "WC2A 3LZ",
    category: "Criminal Defence",
    subcategory: "criminal-defence",
    description: "Leading criminal defence firm handling serious fraud, murder, drug trafficking and complex cases. Legal aid available.",
    website: "https://www.burtoncopeland.com",
    isFree: false,
    isSponsored: true,
  },
  {
    id: "9",
    businessName: "Hodge Jones & Allen",
    contactName: "24hr Criminal Line",
    phone: "0808 271 9413",
    email: "criminal@hja.net",
    address: "180 North Gower Street",
    city: "London",
    postcode: "NW1 2NB",
    category: "Criminal Defence",
    subcategory: "criminal-defence",
    description: "Award-winning criminal defence solicitors. 24-hour police station representation. Legal aid accepted.",
    website: "https://www.hja.net",
    isFree: false,
    isSponsored: false,
  },
  // Drink Driving
  {
    id: "10",
    businessName: "Drink Driving Solicitors UK",
    contactName: "Motoring Team",
    phone: "0800 999 5535",
    email: "enquiries@drinkdrivingsolicitorsuk.co.uk",
    address: "Temple Chambers, 3-7 Temple Avenue",
    city: "London",
    postcode: "EC4Y 0HP",
    category: "Criminal Defence",
    subcategory: "drink-driving",
    description: "Specialist drink driving defence solicitors. Expert in challenging breathalyser evidence and procedural errors.",
    website: "https://www.drinkdrivingsolicitorsuk.co.uk",
    isFree: false,
    isSponsored: true,
  },
  {
    id: "11",
    businessName: "Patterson Law",
    contactName: "Motoring Defence",
    phone: "0161 399 0180",
    email: "motoring@pattersonlaw.co.uk",
    address: "53 King Street",
    city: "Manchester",
    postcode: "M2 4LQ",
    category: "Criminal Defence",
    subcategory: "drink-driving",
    description: "Specialist motoring and drink driving solicitors serving the North West. Free initial consultation.",
    isFree: false,
    isSponsored: false,
  },
  // Personal Injury
  {
    id: "12",
    businessName: "Slater and Gordon",
    contactName: "Personal Injury Team",
    phone: "0330 041 5869",
    email: "injury@slatergordon.co.uk",
    address: "58 Mosley Street",
    city: "Manchester",
    postcode: "M2 3HZ",
    category: "Personal Injury & Clinical",
    subcategory: "personal-injury",
    description: "No Win No Fee personal injury claims. Specialists in serious injury, accidents at work, and road traffic accidents.",
    website: "https://www.slatergordon.co.uk",
    isFree: true,
    isSponsored: true,
  },
  {
    id: "13",
    businessName: "Irwin Mitchell",
    contactName: "Injury Helpline",
    phone: "0370 1500 100",
    email: "enquiries@irwinmitchell.com",
    address: "40 Holborn Viaduct",
    city: "London",
    postcode: "EC1N 2PZ",
    category: "Personal Injury & Clinical",
    subcategory: "personal-injury",
    description: "Leading personal injury law firm. No Win No Fee. Specialists in life-changing and catastrophic injuries.",
    website: "https://www.irwinmitchell.com",
    isFree: true,
    isSponsored: false,
  },
  // Clinical Negligence
  {
    id: "14",
    businessName: "Leigh Day",
    contactName: "Medical Negligence Team",
    phone: "020 7650 1200",
    email: "medicalnegligence@leighday.co.uk",
    address: "Priory House, 25 St John's Lane",
    city: "London",
    postcode: "EC1M 4LB",
    category: "Personal Injury & Clinical",
    subcategory: "clinical-negligence",
    description: "Award-winning clinical negligence solicitors. Specialists in birth injuries, surgical errors, and misdiagnosis claims.",
    website: "https://www.leighday.co.uk",
    isFree: true,
    isSponsored: false,
  },
  // Debt & Insolvency
  {
    id: "15",
    businessName: "National Debtline",
    contactName: "Advice Team",
    phone: "0808 808 4000",
    email: "advice@nationaldebtline.org",
    address: "Tricorn House, 51-53 Hagley Road",
    city: "Birmingham",
    postcode: "B16 8TP",
    category: "Debt & Insolvency",
    subcategory: "debt-management",
    description: "Free, confidential debt advice. Help with budgeting, dealing with creditors, and debt solutions.",
    website: "https://www.nationaldebtline.org",
    isFree: true,
    isSponsored: false,
  },
  {
    id: "16",
    businessName: "Business Debtline",
    contactName: "Business Advice",
    phone: "0800 197 6026",
    email: "businessadvice@businessdebtline.org",
    address: "Tricorn House, 51-53 Hagley Road",
    city: "Birmingham",
    postcode: "B16 8TP",
    category: "Debt & Insolvency",
    subcategory: "debt-management",
    description: "Free debt advice for self-employed and small business owners across the UK.",
    website: "https://www.businessdebtline.org",
    isFree: true,
    isSponsored: false,
  },
  // Intellectual Property
  {
    id: "17",
    businessName: "Marks & Clerk",
    contactName: "IP Enquiries",
    phone: "020 7420 0000",
    email: "london@marks-clerk.com",
    address: "90 Long Acre",
    city: "London",
    postcode: "WC2E 9RA",
    category: "Intellectual Property",
    subcategory: "patents",
    description: "International patent and trade mark attorneys. Expert advice on IP protection and enforcement.",
    website: "https://www.marks-clerk.com",
    isFree: false,
    isSponsored: true,
  },
  {
    id: "18",
    businessName: "Mewburn Ellis",
    contactName: "Patent Team",
    phone: "020 7776 5300",
    email: "london@mewburn.com",
    address: "33 Gutter Lane",
    city: "London",
    postcode: "EC2V 8AS",
    category: "Intellectual Property",
    subcategory: "patents",
    description: "Leading patent and trade mark attorneys. Specialists in technology, life sciences, and engineering patents.",
    website: "https://www.mewburn.com",
    isFree: false,
    isSponsored: false,
  },
  // Public & Human Rights
  {
    id: "19",
    businessName: "Liberty",
    contactName: "Advice Line",
    phone: "020 7403 3888",
    email: "info@libertyhumanrights.org.uk",
    address: "Liberty House, 26-30 Strutton Ground",
    city: "London",
    postcode: "SW1P 2HR",
    category: "Public & Human Rights",
    subcategory: "human-rights",
    description: "Free advice on human rights and civil liberties issues. Campaigns for fundamental rights in the UK.",
    website: "https://www.libertyhumanrights.org.uk",
    isFree: true,
    isSponsored: false,
  },
  {
    id: "20",
    businessName: "Disability Rights UK",
    contactName: "Helpline",
    phone: "0330 995 0400",
    email: "enquiries@disabilityrightsuk.org",
    address: "Plexal, 14 East Bay Lane",
    city: "London",
    postcode: "E15 2GW",
    category: "Public & Human Rights",
    subcategory: "benefits-appeals",
    description: "Free information and advice on disability benefits, PIP appeals, and disability discrimination.",
    website: "https://www.disabilityrightsuk.org",
    isFree: true,
    isSponsored: false,
  },
  // Military & Armed Forces
  {
    id: "21",
    businessName: "Forces Law",
    contactName: "Military Team",
    phone: "0808 169 6866",
    email: "enquiries@forceslaw.com",
    address: "34 Lime Street",
    city: "London",
    postcode: "EC3M 7AT",
    category: "Military & Armed Forces",
    subcategory: "courts-martial",
    description: "Specialist military law firm. Experts in courts martial, service complaints, and armed forces compensation.",
    website: "https://www.forceslaw.com",
    isFree: false,
    isSponsored: true,
  },
  {
    id: "22",
    businessName: "Royal British Legion",
    contactName: "Advice Line",
    phone: "0808 802 8080",
    email: "info@britishlegion.org.uk",
    address: "199 Borough High Street",
    city: "London",
    postcode: "SE1 1AA",
    category: "Military & Armed Forces",
    subcategory: "veterans-rights",
    description: "Free advice and support for serving personnel, veterans, and their families. Help with benefits, housing, and welfare.",
    website: "https://www.britishlegion.org.uk",
    isFree: true,
    isSponsored: false,
  },
  // Consumer & Regulatory
  {
    id: "23",
    businessName: "Financial Ombudsman Service",
    contactName: "Consumer Helpline",
    phone: "0800 023 4567",
    email: "complaint.info@financial-ombudsman.org.uk",
    address: "Exchange Tower, Harbour Exchange Square",
    city: "London",
    postcode: "E14 9SR",
    category: "Consumer & Regulatory",
    subcategory: "financial-ombudsman",
    description: "Free, independent service for resolving complaints between consumers and financial businesses.",
    website: "https://www.financial-ombudsman.org.uk",
    isFree: true,
    isSponsored: false,
  },
  {
    id: "24",
    businessName: "Which? Legal Service",
    contactName: "Consumer Rights",
    phone: "0292 267 0000",
    email: "legal@which.co.uk",
    address: "2 Marylebone Road",
    city: "London",
    postcode: "NW1 4DF",
    category: "Consumer & Regulatory",
    subcategory: "consumer-disputes",
    description: "Expert consumer rights advice and legal support for product issues, faulty goods, and service complaints.",
    website: "https://www.which.co.uk/legal",
    isFree: false,
    isSponsored: true,
  },
];

const legalAidListings: Listing[] = (legalAidListingsRaw as any[]).map((l) => ({
  ...l,
  // Enforce the ADL flags so the UI can consistently distinguish legal aid.
  isFree: false,
  isSponsored: false,
  isLegalAid: true,
}));

const mergedListings: Listing[] = [...listings, ...legalAidListings];

// Fetch all listings
export function fetchAllListings(): Listing[] {
  return mergedListings;
}

// Get listings by subcategory
export function getListingsBySubcategory(subcategory: string): Listing[] {
  return mergedListings.filter((listing) => listing.subcategory === subcategory);
}

export function getCategoryInfo(slug: string): { name: string; parentCategory: string; isFree?: boolean } | null {
  for (const [parentCategory, subcategories] of Object.entries(categories)) {
    const found = subcategories.find((sub) => sub.slug === slug);
    if (found) {
      return { name: found.name, parentCategory, isFree: found.free };
    }
  }
  return null;
}

export function getAllSubcategories(): { name: string; slug: string; parentCategory: string; free?: boolean }[] {
  const result: { name: string; slug: string; parentCategory: string; free?: boolean }[] = [];
  for (const [parentCategory, subcategories] of Object.entries(categories)) {
    for (const sub of subcategories) {
      result.push({ ...sub, parentCategory });
    }
  }
  return result;
}

/** Cities with at least one listing (for search facets), most common first. */
export function getDistinctCities(options?: { minLength?: number; max?: number }): string[] {
  const minLength = options?.minLength ?? 2;
  const max = options?.max ?? 36;
  const counts = new Map<string, number>();
  for (const l of mergedListings) {
    const c = l.city?.trim();
    if (!c || c.length < minLength) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city)
    .slice(0, max);
}
