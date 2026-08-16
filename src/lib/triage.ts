import type { Lang } from "./i18n";

export const SPECIALTIES = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Orthopedic Surgeon",
  "Pediatrician",
  "Neurologist",
  "Gynecologist",
  "ENT Specialist",
  "Psychiatrist",
  "Gastroenterologist",
];

export const RED_FLAGS = [
  "chest pain",
  "chest tightness",
  "heart attack",
  "cannot breathe",
  "can't breathe",
  "breathless",
  "shortness of breath",
  "unconscious",
  "fainted",
  "severe bleeding",
  "heavy bleeding",
  "bleeding a lot",
  "stroke",
  "face droop",
  "slurred speech",
  "paralysis",
  "seizure",
  "fits",
  "poison",
  "suicide",
  "accident",
  "severe burn",
  "छाती में दर्द",
  "साँस",
  "बेहोश",
  "खून",
  "दौरा",
  "ఛాతీ నొప్పి",
  "ఊపిరి",
  "స్పృహ",
  "రక్తస్రావం",
  "మూర్ఛ",
];

type Rule = {
  specialty: string;
  keywords: string[];
};

const RULES: Rule[] = [
  {
    specialty: "Cardiologist",
    keywords: ["heart", "palpitation", "blood pressure", "bp high", "cholesterol", "chest", "दिल", "గుండె", "రక్తపోటు"],
  },
  {
    specialty: "Dermatologist",
    keywords: ["skin", "rash", "itching", "acne", "pimple", "hair fall", "eczema", "त्वचा", "खुजली", "बाल", "చర్మం", "దురద", "జుట్టు"],
  },
  {
    specialty: "Orthopedic Surgeon",
    keywords: ["bone", "joint", "knee", "back pain", "fracture", "sprain", "shoulder", "हड्डी", "जोड़", "कमर", "ఎముక", "మోకాలు", "నడుము"],
  },
  {
    specialty: "Pediatrician",
    keywords: ["child", "baby", "infant", "kid", "vaccination", "बच्चा", "शिशु", "टीका", "పిల్ల", "శిశువు", "టీకా"],
  },
  {
    specialty: "Neurologist",
    keywords: ["headache", "migraine", "dizzy", "numbness", "tremor", "memory", "सिरदर्द", "चक्कर", "तलనొప్పి", "తలనొప్పి", "మైకం"],
  },
  {
    specialty: "Gynecologist",
    keywords: ["period", "menstrual", "pregnan", "womb", "white discharge", "मासिक", "गर्भ", "నెలసరి", "గర్భం"],
  },
  {
    specialty: "ENT Specialist",
    keywords: ["ear", "nose", "throat", "sinus", "hearing", "tonsil", "कान", "नाक", "गला", "చెవి", "ముక్కు", "గొంతు"],
  },
  {
    specialty: "Psychiatrist",
    keywords: ["stress", "anxiety", "depress", "sleep", "panic", "mood", "तनाव", "नींद", "चिंता", "ఒత్తిడి", "నిద్ర", "ఆందోళన"],
  },
  {
    specialty: "Gastroenterologist",
    keywords: ["stomach", "acidity", "vomit", "loose motion", "diarrhea", "constipation", "liver", "gas", "पेट", "उल्टी", "दस्त", "కడుపు", "వాంతి", "విరేచనాలు"],
  },
  {
    specialty: "General Physician",
    keywords: ["fever", "cold", "cough", "weakness", "body pain", "tired", "sugar", "diabetes", "बुखार", "खांसी", "सर्दी", "కమ్ముకు", "జ్వరం", "దగ్గు", "జలుబు"],
  },
];

export function matchSpecialty(text: string): string {
  const lower = text.toLowerCase();
  let best = "General Physician";
  let bestScore = 0;
  for (const rule of RULES) {
    const score = rule.keywords.reduce((acc, k) => (lower.includes(k.toLowerCase()) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = rule.specialty;
    }
  }
  return best;
}

export function isEmergency(text: string): boolean {
  const lower = text.toLowerCase();
  return RED_FLAGS.some((flag) => lower.includes(flag.toLowerCase()));
}

export const SPECIALTY_LABEL: Record<Lang, Record<string, string>> = {
  en: Object.fromEntries(SPECIALTIES.map((s) => [s, s])),
  hi: {
    "General Physician": "सामान्य चिकित्सक",
    Cardiologist: "हृदय रोग विशेषज्ञ",
    Dermatologist: "त्वचा रोग विशेषज्ञ",
    "Orthopedic Surgeon": "हड्डी रोग विशेषज्ञ",
    Pediatrician: "बाल रोग विशेषज्ञ",
    Neurologist: "न्यूरोलॉजिस्ट",
    Gynecologist: "स्त्री रोग विशेषज्ञ",
    "ENT Specialist": "कान-नाक-गला विशेषज्ञ",
    Psychiatrist: "मनोचिकित्सक",
    Gastroenterologist: "पेट रोग विशेषज्ञ",
  },
  te: {
    "General Physician": "సాధారణ వైద్యుడు",
    Cardiologist: "గుండె వైద్య నిపుణుడు",
    Dermatologist: "చర్మ వైద్య నిపుణుడు",
    "Orthopedic Surgeon": "ఎముకల వైద్య నిపుణుడు",
    Pediatrician: "పిల్లల వైద్య నిపుణుడు",
    Neurologist: "నరాల వైద్య నిపుణుడు",
    Gynecologist: "స్త్రీ వైద్య నిపుణురాలు",
    "ENT Specialist": "చెవి-ముక్కు-గొంతు నిపుణుడు",
    Psychiatrist: "మానసిక వైద్య నిపుణుడు",
    Gastroenterologist: "జీర్ణకోశ వైద్య నిపుణుడు",
  },
};

export function specialtyLabel(lang: Lang, specialty: string) {
  return SPECIALTY_LABEL[lang]?.[specialty] ?? specialty;
}

export const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
];
