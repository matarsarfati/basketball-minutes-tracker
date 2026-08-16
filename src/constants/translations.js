export const COURT_RPE_MAP = {
    1: { en: "Very Light", he: "קל מאוד" },
    2: { en: "Light", he: "קל" },
    3: { en: "Moderate", he: "מתון" },
    4: { en: "Somewhat Hard", he: "בינוני-קל" },
    5: { en: "Hard", he: "קשה" },
    6: { en: "Hard+", he: "+קשה" },
    7: { en: "Very Hard", he: "קשה מאוד" },
    8: { en: "Very Hard+", he: "+קשה מאוד" },
    9: { en: "Near Maximal", he: "כמעט מקסימלי" },
    10: { en: "Maximal Effort", he: "מאמץ מרבי" }
};

export const GYM_RPE_MAP = {
    1: { en: "No Effort", he: "ללא מאמץ" },
    2: { en: "Very Light", he: "קל מאוד" },
    3: { en: "Light", he: "קל" },
    4: { en: "Somewhat Light", he: "בינוני-קל" },
    5: { en: "Moderate", he: "בינוני" },
    6: { en: "Moderate-Heavy", he: "בינוני-כבד" },
    7: { en: "Heavy", he: "כבד" },
    8: { en: "Very Heavy", he: "כבד מאוד" },
    9: { en: "Near Max", he: "כבד קיצוני" },
    10: { en: "Failure", he: "כשל (מאמץ מרבי)" }
};

export const LEGS_MAP = {
    1: { en: "Fresh & Bouncy", he: "רעננות וקפיציות" },
    2: { en: "Very Good", he: "טובות מאוד" },
    3: { en: "Normal", he: "רגילות" },
    4: { en: "Mild Fatigue", he: "עייפות קלה" },
    5: { en: "Tired", he: "עייפות מורגשת" },
    6: { en: "Heavy", he: "כבדות" },
    7: { en: "Very Heavy", he: "כבדות מאוד" },
    8: { en: "Sore", he: "תפוסות" },
    9: { en: "Very Sore", he: "כואבות מאוד" },
    10: { en: "Dead Legs", he: "״גמורות״" }
};

export const UI_LABELS = {
    selectPlayer: { en: "Select Player", he: "Select Player" },
    chooseName: { en: "Choose your name...", he: "Choose your name..." },
    loading: { en: "Loading...", he: "טוען..." },
    submit: { en: "Submit Feedback", he: "שלח משוב" },
    courtSession: { en: "Court Session", he: "אימון מגרש" },
    gymSession: { en: "Gym Session", he: "אימון חדר כושר" },
    notesLabel: { en: "Notes & Comments", he: "הערות ודגשים" },
    notesPlaceholder: { en: "Any injuries, soreness, or specific feedback...", he: "פציעות, כאבים או משהו שחשוב שנדע..." },
    gymTip: {
        en: "Tip: For gym RPE, consider the heaviness of the weights relative to your max effort today.",
        he: "טיפ: ב-RPE חדר כושר, התייחס לכובד המשקלים ביחס למאמץ המקסימלי שלך היום."
    },
    successTitle: { en: "Awesome!", he: "מעולה!" },
    nextPlayer: { en: "Next Player", he: "שחקן הבא" },
    retry: { en: "Retry", he: "נסה שוב" },
    error: { en: "Error", he: "שגיאה" },
    backToPractice: { en: "Back to Practice", he: "חזרה לאימון" },
    gymSurveyTitle: { en: "Gym Session Feedback", he: "משוב אימון כושר" },
    saveResponse: { en: "Save Response", he: "שמור תשובה" },
    waitingFor: { en: "Still waiting for:", he: "עדיין לא מילאו:" },
    allComplete: { en: "All present players have completed the survey!", he: "כל הנוכחים מילאו את השאלון!" },
    completedCount: { en: "Complete", he: "הושלמו" },
    combinedFeedback: { en: "Combined Feedback", he: "משוב משולב" },
    courtIntensity: { en: "Court Intensity (RPE)", he: "עצימות אימון מגרש (RPE)" },
    legsHealth: { en: "Leg Health / Freshness", he: "מצב רגליים / רעננות" },
    gymIntensity: { en: "Gym Intensity (RPE)", he: "עצימות אימון כושר (RPE)" }
};

export const SUCCESS_MESSAGES = {
    en: [
        "Now it's time for rest, you earned it.",
        "The basket already misses you.",
        "Great work today, champion.",
        "Recovery is part of the process.",
        "See you at the next practice!",
        "Another brick in the wall of success.",
        "Rest up, tomorrow we go again."
    ],
    he: [
        "עכשיו זמן לנוח, הרווחת את זה.",
        "הסל כבר מתגעגע אליך.",
        "עבודה טובה היום, אלוף.",
        "התאוששות היא חלק מהתהליך.",
        "נתראה באימון הבא!",
        "עוד לבנה בחומה של ההצלחה.",
        "תנוח טוב, מחר ממשיכים."
    ]
};

export const getTranslation = (lang, key) => {
    return UI_LABELS[key]?.[lang] || UI_LABELS[key]?.en || key;
};

export const getRpeText = (lang, value, type = 'court') => {
    const map = type === 'gym' ? GYM_RPE_MAP : COURT_RPE_MAP;
    return map[value]?.[lang] || map[value]?.en || "";
};

export const getLegsText = (lang, value) => {
    return LEGS_MAP[value]?.[lang] || LEGS_MAP[value]?.en || "";
};
