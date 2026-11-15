// Tiny i18n: t('English text') -> Hindi when language is 'hi'
let LANG = 'en'
export const setLang = (l) => { LANG = l === 'hi' ? 'hi' : 'en' }
export const getLang = () => LANG

const HI = {
  // nav / titles
  Home: 'होम', History: 'हिसाब', Reports: 'रिपोर्ट', More: 'और', Settings: 'सेटिंग्स', Kharcha: 'खर्चा',
  'Connect Drive': 'ड्राइव जोड़ें', 'Tap to sync': 'सिंक करें', Synced: 'सिंक हुआ', Syncing: 'सिंक हो रहा',
  // home
  'Good morning': 'सुप्रभात', 'Good afternoon': 'नमस्ते', 'Good evening': 'शुभ संध्या',
  'Wallet balance': 'वॉलेट बैलेंस', 'Left this month': 'इस महीने बचा', Income: 'आय', Spent: 'खर्च', 'Safe / day': 'रोज़ सुरक्षित',
  'used': 'खर्च', 'days left': 'दिन बाकी', Cycle: 'चक्र',
  'Salary credited?': 'सैलरी आ गई?', Add: 'जोड़ें', Set: 'सेट करें',
  Today: 'आज', Week: 'हफ़्ता', 'Avg/day': 'औसत/दिन', Yesterday: 'कल',
  'Category budgets': 'कैटेगरी बजट', Manage: 'बदलें', Recent: 'हाल के', 'See all': 'सब देखें',
  'Tap + to add your first expense': 'पहला खर्च जोड़ने के लिए + दबाएँ', 'No spending yet this cycle': 'इस महीने अभी कोई खर्च नहीं',
  Insights: 'सुझाव', 'swipe →': 'स्वाइप →', 'Quick add': 'झटपट जोड़ें', Tools: 'टूल्स',
  'Upcoming bills': 'आने वाले बिल', 'Did you add today\'s expenses?': 'आज के खर्च डाले?', 'No-spend day': 'आज कोई खर्च नहीं',
  'Add now': 'अभी जोड़ें',
  // add sheet
  'Add entry': 'एंट्री जोड़ें', 'Edit entry': 'एंट्री बदलें', '− Expense': '− खर्च', '+ Income': '+ आय',
  'Note (optional)': 'नोट (वैकल्पिक)', 'Enter amount': 'रकम डालें', 'Pick a category': 'कैटेगरी चुनें', Save: 'सेव', Delete: 'हटाएँ', Edit: 'बदलें',
  'Bill photo': 'बिल फोटो', 'Save as quick-add': 'झटपट में सेव करें', Listening: 'सुन रहा हूँ', 'Speak now…': 'अब बोलें…',
  // history
  List: 'सूची', Calendar: 'कैलेंडर', 'This week': 'इस हफ़्ते', 'This month': 'इस महीने', All: 'सब', Custom: 'चुनें',
  'All types': 'सभी प्रकार', 'All categories': 'सभी कैटेगरी', 'All methods': 'सभी तरीके', Received: 'मिला',
  'No entries found': 'कोई एंट्री नहीं', 'Tip: swipe an entry left to edit or delete': 'टिप: एंट्री को बाएँ स्वाइप करें — बदलें या हटाएँ',
  'No entries this day': 'इस दिन कोई एंट्री नहीं',
  // reports
  Daily: 'रोज़', Weekly: 'हफ़्ता', Monthly: 'महीना', Yearly: 'साल', 'Spending trend': 'खर्च का ट्रेंड',
  'Where money went': 'पैसा कहाँ गया', 'Paid via': 'भुगतान', 'Last 6 months': 'पिछले 6 महीने', Saved: 'बचत', Overspent: 'ज़्यादा खर्च',
  'Avg / day': 'औसत / दिन', Biggest: 'सबसे बड़ा', 'Back to current': 'वर्तमान पर लौटें', 'Monthly PDF report': 'मासिक PDF रिपोर्ट',
  // more
  'Salary & balance': 'सैलरी और बैलेंस', 'Categories & budgets': 'कैटेगरी और बजट', 'Google Drive sync': 'गूगल ड्राइव सिंक',
  'App lock': 'ऐप लॉक', 'Recently deleted': 'हाल में हटाए', Appearance: 'दिखावट', Language: 'भाषा',
  'Default payment method': 'डिफ़ॉल्ट भुगतान', 'Export to Excel (CSV)': 'Excel (CSV) में निकालें', 'Download backup (JSON)': 'बैकअप डाउनलोड',
  'Restore backup': 'बैकअप वापस लाएँ', 'Clear all entries': 'सब एंट्री मिटाएँ', 'Daily reminder': 'रोज़ का रिमाइंडर',
  // features
  'Bills & subscriptions': 'बिल और सब्सक्रिप्शन', Bills: 'बिल', Udhaar: 'उधार', 'Shopping list': 'शॉपिंग लिस्ट', Shopping: 'शॉपिंग',
  Badges: 'बैज', Streak: 'स्ट्रीक', Voice: 'बोलें', Report: 'रिपोर्ट', Favourites: 'पसंदीदा',
  'day streak': 'दिन की स्ट्रीक', 'Keep it going!': 'जारी रखें!', 'Start today!': 'आज से शुरू करें!',
  'Mark paid': 'भुगतान हो गया', Paid: 'भुगतान हुआ', Overdue: 'बकाया', 'Due today': 'आज देय', 'Due in': 'बाकी', days: 'दिन',
  'Add bill': 'बिल जोड़ें', 'You will get': 'आपको मिलेंगे', 'You owe': 'आपको देने हैं', 'I gave': 'मैंने दिया', 'I took': 'मैंने लिया',
  'Remind on WhatsApp': 'WhatsApp पर याद दिलाएँ', Settled: 'चुकता', 'Mark settled': 'चुकता करें', 'Add udhaar': 'उधार जोड़ें',
  'Add item': 'सामान जोड़ें', 'Bought ✓': 'खरीद लिया ✓', 'Clear done': 'पूरे हटाएँ', Name: 'नाम', Amount: 'रकम', Phone: 'फ़ोन',
  'Due day of month': 'महीने की तारीख़', Cancel: 'रद्द करें', 'Create PDF': 'PDF बनाएँ', Share: 'शेयर',
}

export const t = (s) => (LANG === 'hi' && HI[s]) || s

const CAT_HI = {
  food: 'खाना-पीना', grocery: 'राशन', travel: 'सफ़र', fuel: 'पेट्रोल', bills: 'बिल/रिचार्ज', rent: 'किराया', shopping: 'शॉपिंग',
  health: 'दवा/सेहत', education: 'पढ़ाई', fun: 'मनोरंजन', emi: 'EMI/लोन', family: 'परिवार', other: 'अन्य',
  salary: 'सैलरी', cashback: 'कैशबैक/रिफ़ंड', otherin: 'अन्य आय',
}
const CAT_EN = {
  food: 'Food & Dining', grocery: 'Groceries', travel: 'Travel', fuel: 'Fuel', bills: 'Bills & Recharge', rent: 'Rent', shopping: 'Shopping',
  health: 'Health', education: 'Education', fun: 'Entertainment', emi: 'EMI / Loan', family: 'Family', other: 'Other',
  salary: 'Salary', cashback: 'Cashback / Refund', otherin: 'Other Income',
}
// default category names follow the language (custom names stay as typed)
export const catName = (c) => (c && LANG === 'hi' && CAT_EN[c.id] === c.name ? CAT_HI[c.id] : c?.name)
