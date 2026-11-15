// Voice entry: Web Speech API (Chrome Android / desktop) + simple Hindi/English parser
export const voiceSupported = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition)

export function listen(lang = 'hi-IN') {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return reject(new Error('Voice not supported in this browser – use Chrome'))
    const r = new SR()
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 1
    let done = false
    const timer = setTimeout(() => { if (!done) { done = true; try { r.abort() } catch { /* */ } reject(new Error('Nothing heard – try again')) } }, 12000)
    r.onresult = (e) => { done = true; clearTimeout(timer); resolve(e.results[0][0].transcript) }
    r.onerror = (e) => { done = true; reject(new Error(e.error === 'not-allowed' ? 'Microphone permission denied' : e.error === 'no-speech' ? 'Nothing heard – try again' : 'Voice error: ' + e.error)) }
    r.onend = () => { if (!done) reject(new Error('Nothing heard – try again')) }
    r.start()
  })
}

const KW = {
  food: ['chai', 'tea', 'coffee', 'lunch', 'dinner', 'breakfast', 'nashta', 'khana', 'food', 'pizza', 'burger', 'samosa', 'snacks', 'zomato', 'swiggy', 'चाय', 'खाना', 'नाश्ता', 'कॉफी', 'लंच', 'डिनर', 'समोसा', 'पिज़्ज़ा'],
  grocery: ['grocery', 'sabzi', 'sabji', 'vegetable', 'vegetables', 'doodh', 'milk', 'ration', 'dmart', 'atta', 'सब्ज़ी', 'सब्जी', 'दूध', 'राशन', 'किराना', 'आटा'],
  travel: ['auto', 'metro', 'bus', 'cab', 'uber', 'ola', 'rapido', 'taxi', 'train', 'ticket', 'rickshaw', 'ऑटो', 'मेट्रो', 'बस', 'टैक्सी', 'ट्रेन', 'रिक्शा', 'टिकट'],
  fuel: ['petrol', 'diesel', 'fuel', 'cng', 'पेट्रोल', 'डीज़ल', 'डीजल'],
  bills: ['recharge', 'bill', 'electricity', 'bijli', 'wifi', 'internet', 'रिचार्ज', 'बिल', 'बिजली'],
  rent: ['rent', 'kiraya', 'किराया'],
  shopping: ['shopping', 'clothes', 'kapde', 'shirt', 'shoes', 'amazon', 'flipkart', 'meesho', 'कपड़े', 'शॉपिंग', 'जूते'],
  health: ['medicine', 'dawai', 'dawa', 'doctor', 'hospital', 'tablet', 'दवा', 'दवाई', 'डॉक्टर', 'अस्पताल'],
  education: ['book', 'books', 'course', 'fees', 'fee', 'pen', 'किताब', 'फीस', 'कॉपी'],
  fun: ['movie', 'film', 'netflix', 'game', 'party', 'फिल्म', 'मूवी', 'पार्टी'],
  emi: ['emi', 'loan', 'ईएमआई', 'लोन', 'किस्त'],
  family: ['family', 'gift', 'ghar', 'mummy', 'papa', 'घर', 'परिवार', 'गिफ्ट', 'मम्मी', 'पापा'],
  salary: ['salary', 'सैलरी', 'तनख्वाह', 'पगार'],
  cashback: ['cashback', 'refund', 'कैशबैक', 'रिफंड'],
}
const INCOME_WORDS = ['mila', 'mile', 'received', 'got', 'income', 'मिला', 'मिले', 'आए', 'आया']
const DROP = new Set(['₹', 'rs', 'rs.', 'rupee', 'rupees', 'rupaye', 'rupaiye', 'rupay', 'रुपए', 'रुपये', 'रूपये', 'रुपया', 'रु', 'का', 'के', 'की', 'में', 'ka', 'ke', 'ki', 'me', 'mein', 'for', 'hazar', 'hazaar', 'thousand', 'हज़ार', 'हजार', 'sau', 'hundred', 'सौ', 'k'])

export function parseVoice(text) {
  const raw = text.trim()
  const low = raw.toLowerCase().replace(/,/g, '')
  // amount: digits, with optional sau/hazar multipliers
  let amount = 0
  const m = low.match(/(\d+(?:\.\d+)?)\s*(hazar|hazaar|thousand|हज़ार|हजार|k|sau|hundred|सौ)?/)
  if (m) {
    amount = parseFloat(m[1])
    const mult = m[2] || ''
    if (/hazar|hazaar|thousand|हज़ार|हजार|^k$/.test(mult)) amount *= 1000
    else if (/sau|hundred|सौ/.test(mult)) amount *= 100
  }
  let catId = ''
  for (const [id, words] of Object.entries(KW)) if (words.some((w) => low.includes(w))) { catId = id; break }
  const income = catId === 'salary' || catId === 'cashback' || INCOME_WORDS.some((w) => low.split(/\s+/).includes(w))
  const note = raw.split(/\s+/).filter((w) => w && !/^[₹]?\d/.test(w) && !DROP.has(w.toLowerCase())).join(' ').trim()
  return { type: income ? 'income' : 'expense', amount, catId: catId || (income ? 'otherin' : ''), note: note ? note[0].toUpperCase() + note.slice(1) : '' }
}
