"""Languages offered by the SANTALIQ translator (NLLB-200 / FLORES-200 codes).

Santali uses NLLB's `sat_Beng` code. NLLB's Santali training data is in Ol Chiki,
so output arrives in Ol Chiki; the web app converts it to every other script.
"""

SANTALI = "sat_Beng"

# (FLORES-200 code, English name, native name, ISO/BCP-47 code used by Google and browsers).
# Order = display order after Santali.
LANGUAGES: list[tuple[str, str, str, str]] = [
    (SANTALI, "Santali", "ᱥᱟᱱᱛᱟᱲᱤ", "sat"),
    ("eng_Latn", "English", "English", "en"),
    ("ben_Beng", "Bengali", "বাংলা", "bn"),
    ("hin_Deva", "Hindi", "हिन्दी", "hi"),
    ("ory_Orya", "Odia", "ଓଡ଼ିଆ", "or"),
    ("asm_Beng", "Assamese", "অসমীয়া", "as"),
    ("npi_Deva", "Nepali", "नेपाली", "ne"),
    ("mai_Deva", "Maithili", "मैथिली", "mai"),
    ("bho_Deva", "Bhojpuri", "भोजपुरी", "bho"),
    ("mar_Deva", "Marathi", "मराठी", "mr"),
    ("guj_Gujr", "Gujarati", "ગુજરાતી", "gu"),
    ("pan_Guru", "Punjabi", "ਪੰਜਾਬੀ", "pa"),
    ("urd_Arab", "Urdu", "اردو", "ur"),
    ("tam_Taml", "Tamil", "தமிழ்", "ta"),
    ("tel_Telu", "Telugu", "తెలుగు", "te"),
    ("kan_Knda", "Kannada", "ಕನ್ನಡ", "kn"),
    ("mal_Mlym", "Malayalam", "മലയാളം", "ml"),
    ("sin_Sinh", "Sinhala", "සිංහල", "si"),
    ("deu_Latn", "German", "Deutsch", "de"),
    ("fra_Latn", "French", "Français", "fr"),
    ("spa_Latn", "Spanish", "Español", "es"),
    ("por_Latn", "Portuguese", "Português", "pt"),
    ("ita_Latn", "Italian", "Italiano", "it"),
    ("nld_Latn", "Dutch", "Nederlands", "nl"),
    ("swe_Latn", "Swedish", "Svenska", "sv"),
    ("nob_Latn", "Norwegian", "Norsk bokmål", "no"),
    ("dan_Latn", "Danish", "Dansk", "da"),
    ("fin_Latn", "Finnish", "Suomi", "fi"),
    ("pol_Latn", "Polish", "Polski", "pl"),
    ("ces_Latn", "Czech", "Čeština", "cs"),
    ("ron_Latn", "Romanian", "Română", "ro"),
    ("hun_Latn", "Hungarian", "Magyar", "hu"),
    ("ell_Grek", "Greek", "Ελληνικά", "el"),
    ("rus_Cyrl", "Russian", "Русский", "ru"),
    ("ukr_Cyrl", "Ukrainian", "Українська", "uk"),
    ("tur_Latn", "Turkish", "Türkçe", "tr"),
    ("arb_Arab", "Arabic", "العربية", "ar"),
    ("pes_Arab", "Persian", "فارسی", "fa"),
    ("heb_Hebr", "Hebrew", "עברית", "he"),
    ("zho_Hans", "Chinese (Simplified)", "简体中文", "zh-CN"),
    ("zho_Hant", "Chinese (Traditional)", "繁體中文", "zh-TW"),
    ("jpn_Jpan", "Japanese", "日本語", "ja"),
    ("kor_Hang", "Korean", "한국어", "ko"),
    ("vie_Latn", "Vietnamese", "Tiếng Việt", "vi"),
    ("tha_Thai", "Thai", "ไทย", "th"),
    ("ind_Latn", "Indonesian", "Bahasa Indonesia", "id"),
    ("zsm_Latn", "Malay", "Bahasa Melayu", "ms"),
    ("tgl_Latn", "Filipino", "Tagalog", "tl"),
    ("mya_Mymr", "Burmese", "မြန်မာ", "my"),
    ("khm_Khmr", "Khmer", "ខ្មែរ", "km"),
    ("swh_Latn", "Swahili", "Kiswahili", "sw"),
    ("amh_Ethi", "Amharic", "አማርኛ", "am"),
]

CODES = {code for code, *_ in LANGUAGES}
ISO = {code: iso for code, _, _, iso in LANGUAGES}
