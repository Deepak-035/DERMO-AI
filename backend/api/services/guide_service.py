from typing import Optional, Dict, Any, List
from api.logger import logger
from api.supabase_client import supabase

# Canonical mapping from model codes and names to stable class_keys
CLASS_MAPPING: Dict[str, str] = {
    # Short codes from CLASS_INFO in labels.py
    "nv": "melanocytic_nevus",
    "mel": "melanoma",
    "bkl": "benign_keratosis",
    "bcc": "basal_cell_carcinoma",
    "akiec": "actinic_keratoses",
    "vasc": "vascular_lesion",
    "df": "dermatofibroma",

    # Full display names
    "melanocytic nevus": "melanocytic_nevus",
    "melanoma": "melanoma",
    "benign keratosis": "benign_keratosis",
    "basal cell carcinoma": "basal_cell_carcinoma",
    "actinic keratoses": "actinic_keratoses",
    "actinic keratosis": "actinic_keratoses",
    "vascular lesion": "vascular_lesion",
    "vascular lesions": "vascular_lesion",
    "dermatofibroma": "dermatofibroma",

    # Stable keys
    "melanocytic_nevus": "melanocytic_nevus",
    "benign_keratosis": "benign_keratosis",
    "basal_cell_carcinoma": "basal_cell_carcinoma",
    "actinic_keratoses": "actinic_keratoses",
    "vascular_lesion": "vascular_lesion",
}

# Medically referenced guides for all 7 supported classes
BASELINE_GUIDES: Dict[str, Dict[str, Any]] = {
    "melanocytic_nevus": {
        "class_key": "melanocytic_nevus",
        "display_name": "Melanocytic Nevus (Common Mole)",
        "overview": (
            "A benign proliferation of melanocytes (pigment-producing cells). "
            "Melanocytic nevi are common skin growths that usually present as uniform, "
            "well-circumscribed, brown or tan macules, papules, or plaques."
        ),
        "risk_factors": [
            "Fair skin and light hair (Fitzpatrick phototypes I and II)",
            "Cumulative childhood and adolescent sun exposure",
            "Family history of numerous or atypical moles",
            "Genetic factors predisposing to melanocytic proliferation",
        ],
        "warning_signs": [
            "Asymmetry in shape or surface elevation",
            "Irregular, notched, or scalloped borders",
            "Color variations within the mole (dark brown, black, blue, pink)",
            "Diameter greater than 6 mm (approx. pencil eraser size)",
            "Evolution or changes in size, shape, surface elevation, bleeding, or persistent itching (ABCDE rule)",
        ],
        "prevention": [
            "Apply broad-spectrum sunscreen (SPF 30+) daily to sun-exposed areas",
            "Avoid peak ultraviolet radiation hours (10:00 AM to 4:00 PM)",
            "Wear ultraviolet-protective clothing, broad-brimmed hats, and sunglasses",
            "Perform monthly full-body skin self-checks to monitor existing moles",
        ],
        "recommended_actions": [
            "Continue regular monthly skin self-examinations using ABCDE criteria",
            "Consult a dermatologist if any mole changes, bleeds, itches, or appears newly atypical",
            "Schedule an annual routine dermatological skin examination if you have multiple or atypical moles",
        ],
        "treatment_overview": (
            "Common benign nevi require no medical treatment. If a nevus exhibits suspicious clinical features "
            "or undergoes changes, complete surgical excision with histopathological analysis is recommended "
            "to rule out dysplasia or malignancy."
        ),
        "urgency_level": "routine",
        "sources": [
            "American Academy of Dermatology (AAD) - Moles: Overview and ABCDEs",
            "DermNet NZ - Melanocytic Naevi",
            "Skin Cancer Foundation - About Moles",
        ],
        "review_status": "published",
        "reviewed_at": "2026-10-21T00:00:00Z",
    },
    "melanoma": {
        "class_key": "melanoma",
        "display_name": "Melanoma",
        "overview": (
            "Melanoma is an aggressive form of skin cancer arising from malignant transformation of melanocytes. "
            "While less common than non-melanoma skin cancers, it is responsible for the vast majority of skin cancer deaths. "
            "Early detection and prompt surgical intervention are paramount."
        ),
        "risk_factors": [
            "History of intense, blistering sunburns (especially during childhood or adolescence)",
            "Excessive ultraviolet (UV) radiation from sunlight or artificial tanning beds",
            "Having more than 50 common moles or presence of atypical (dysplastic) nevi",
            "Personal or first-degree family history of melanoma",
            "Fair complexion, light hair (red or blonde), light eye color, and freckling tendency",
            "Immunosuppression or immunocompromising medical conditions",
        ],
        "warning_signs": [
            "ABCDE criteria: Asymmetry (one half does not match the other)",
            "Border irregularity (ragged, notched, or blurred borders)",
            "Color variegation (multiple shades of brown, black, red, white, or blue)",
            "Diameter larger than 6 mm (though early melanomas can be smaller)",
            "Evolving size, shape, color, or symptoms (rapid enlargement, elevation, firmness, ulceration, spontaneous bleeding)",
            "The 'Ugly Duckling' sign: a lesion that looks conspicuously different from all surrounding moles",
        ],
        "prevention": [
            "Strict sun avoidance and daily application of broad-spectrum SPF 30+ sunscreen",
            "Complete avoidance of indoor tanning booths and UV tanning lamps",
            "Wear tightly woven, UV-protective clothing and UV400-rated sunglasses",
            "Schedule prompt professional skin screenings for high-risk individuals",
        ],
        "recommended_actions": [
            "Seek immediate, urgent clinical evaluation by a board-certified dermatologist or surgical oncologist",
            "Do not attempt any home removal, destructive creams, or non-prescription treatments",
            "A diagnostic full-thickness excisional biopsy with narrow margins should be performed for definitive histopathological diagnosis and Breslow thickness measurement",
        ],
        "treatment_overview": (
            "Primary treatment is wide local surgical excision with margins determined by histological Breslow depth. "
            "Depending on pathological staging, sentinel lymph node biopsy, imaging, targeted therapies (such as BRAF/MEK inhibitors), "
            "immunotherapy (immune checkpoint inhibitors), or radiation therapy may be prescribed by an oncology multidisciplinary team."
        ),
        "urgency_level": "urgent",
        "sources": [
            "National Comprehensive Cancer Network (NCCN) Guidelines - Melanoma: Cutaneous",
            "American Academy of Dermatology (AAD) - Melanoma Clinical Guidelines",
            "National Cancer Institute (NCI) - Melanoma Treatment Protocol",
        ],
        "review_status": "published",
        "reviewed_at": "2026-10-21T00:00:00Z",
    },
    "benign_keratosis": {
        "class_key": "benign_keratosis",
        "display_name": "Benign Keratosis (Seborrheic Keratosis / Solar Lentigo)",
        "overview": (
            "A harmless, non-cancerous skin growth that typically appears with advancing age. "
            "Seborrheic keratoses commonly look like waxy, scaly, or 'stuck-on' raised plaques, "
            "while solar lentigines present as smooth, flat pigmented sun spots."
        ),
        "risk_factors": [
            "Advancing age (most commonly observed after age 40 to 50)",
            "Genetic predisposition and strong family history of seborrheic keratoses",
            "Cumulative lifetime exposure to solar radiation (especially for solar lentigines)",
            "Fair skin complexion",
        ],
        "warning_signs": [
            "Sudden rapid enlargement or conspicuous darkening of an existing lesion",
            "Irregular borders or multiple colors that closely mimic melanoma",
            "Frequent irritation, redness, bleeding, or snagging against jewelry and clothing",
            "Eruptive sudden onset of dozens of lesions within a short timeframe (Leser-Trélat sign), which warrants prompt clinical investigation",
        ],
        "prevention": [
            "Consistent sun protection and sunscreen usage help prevent solar lentigines and photoaging",
            "Seborrheic keratoses are primarily genetically driven and age-related, with no known preventive lifestyle measures",
        ],
        "recommended_actions": [
            "Consult a healthcare professional or dermatologist to verify that atypical lesions are benign and not a disguised malignancy",
            "Seek evaluation if a keratosis becomes persistently inflamed, itchy, or bleeds",
            "Routine observation is medically sufficient for asymptomatic, confirmed benign lesions",
        ],
        "treatment_overview": (
            "Medical treatment is strictly optional and not medically required unless lesions cause physical discomfort, "
            "recurrent trauma, or cosmetic concern. When indicated, common office procedures include cryotherapy with liquid nitrogen, "
            "light curettage, electrodessication, or superficial shave excision."
        ),
        "urgency_level": "routine",
        "sources": [
            "American Academy of Dermatology (AAD) - Seborrheic Keratoses",
            "DermNet NZ - Seborrhoeic Keratosis",
            "Mayo Clinic - Seborrheic Keratosis Diagnosis and Care",
        ],
        "review_status": "published",
        "reviewed_at": "2026-10-21T00:00:00Z",
    },
    "basal_cell_carcinoma": {
        "class_key": "basal_cell_carcinoma",
        "display_name": "Basal Cell Carcinoma (BCC)",
        "overview": (
            "Basal Cell Carcinoma is the most prevalent form of human skin cancer. "
            "It originates in the basal cell layer of the epidermis. BCC is typically slow-growing "
            "and exceptionally rarely metastasizes to distant organs, but if untreated, it can cause extensive "
            "local tissue destruction and ulceration."
        ),
        "risk_factors": [
            "Chronic, cumulative ultraviolet (UV) radiation from sunlight or tanning devices",
            "Frequent blistering sunburns throughout childhood or young adulthood",
            "Fair skin (Fitzpatrick types I and II), light eyes, and freckles",
            "History of previous skin cancers or occupational sun exposure",
            "Previous ionizing radiation therapy or chronic medical immunosuppression",
            "Inherited genetic syndromes (such as Gorlin-Goltz syndrome)",
        ],
        "warning_signs": [
            "Pearly, translucent, or pinkish bump with tiny visible branching blood vessels (telangiectasias)",
            "A non-healing sore or ulcer that recurrently bleeds, oozes, crusts, and re-opens over 3 to 4 weeks",
            "A shiny, firm, pink or red patch, often occurring on the chest or shoulders",
            "A scar-like, pale, waxy, or yellowish flat area with poorly demarcated borders (morpheaform subtype)",
        ],
        "prevention": [
            "Apply water-resistant broad-spectrum sunscreen (SPF 30 or higher) daily 15 minutes before sun exposure",
            "Avoid tanning beds and minimize direct sun exposure between 10:00 AM and 4:00 PM",
            "Wear protective headgear, UV-blocking sunglasses, and sun-protective clothing",
            "Schedule regular clinical skin evaluations with a dermatologist",
        ],
        "recommended_actions": [
            "Schedule a prompt medical appointment with a dermatologist for dermoscopy and evaluation",
            "A skin biopsy is required to confirm histological subtype (nodular, superficial, morpheaform, or infiltrative)",
            "Plan definitive treatment in a timely manner to prevent deeper tissue, nerve, or cartilage involvement",
        ],
        "treatment_overview": (
            "Treatment selection depends on anatomical location, histological subtype, and tumor size. "
            "Mohs micrographic surgery offers the highest cure rate, especially on cosmetically sensitive or high-risk facial zones. "
            "Standard surgical excision with clear margin verification, curettage and electrodessication, "
            "topical immunomodulators (imiquimod/5-FU for superficial BCC), and targeted Hedgehog pathway inhibitors for advanced cases are also utilized."
        ),
        "urgency_level": "prompt",
        "sources": [
            "Skin Cancer Foundation - Basal Cell Carcinoma Overview & Guidelines",
            "American Academy of Dermatology (AAD) - Basal Cell Carcinoma Clinical Guidelines",
            "National Comprehensive Cancer Network (NCCN) - Basal Cell Skin Cancer",
        ],
        "review_status": "published",
        "reviewed_at": "2026-10-21T00:00:00Z",
    },
    "actinic_keratoses": {
        "class_key": "actinic_keratoses",
        "display_name": "Actinic Keratoses (Solar Keratosis / Pre-cancerous Lesion)",
        "overview": (
            "Actinic Keratosis is a common pre-cancerous cutaneous lesion caused by chronic ultraviolet radiation damage. "
            "It affects the keratinocytes in the epidermis and has a documented potential to progress to invasive "
            "Cutaneous Squamous Cell Carcinoma (cSCC) if left untreated."
        ),
        "risk_factors": [
            "Cumulative lifetime exposure to solar ultraviolet (UV) radiation",
            "Fitzpatrick skin phototypes I and II (fair skin, red or blonde hair, blue or green eyes)",
            "Age 40 and older, with increasing frequency in elderly populations",
            "Living in geographic areas with high UV index or high altitudes",
            "History of frequent or severe sunburns",
            "Immunosuppressed individuals (including solid organ transplant recipients)",
        ],
        "warning_signs": [
            "Rough, dry, scaly, or sandpaper-like patch that is often easier to feel than to see",
            "Persistent erythema, stinging, tenderness, or burning in sun-exposed areas",
            "Thickened, hyperkeratotic plaque or cutaneous horn formation",
            "Rapid growth, marked tenderness, induration, or ulceration (which signals possible progression to invasive squamous cell carcinoma)",
        ],
        "prevention": [
            "Rigorous, lifelong sun protection: broad-spectrum SPF 30+ applied every two hours outdoors",
            "Avoid sunbathing and completely avoid artificial UV tanning appliances",
            "Wear broad-brimmed hats, UV-protective long sleeves, and neck coverage",
            "Undergo routine full-body skin surveillance by a dermatologist",
        ],
        "recommended_actions": [
            "Schedule a prompt clinical consultation with a dermatologist for thorough evaluation",
            "Ensure evaluation of adjacent sun-damaged skin (field cancerization)",
            "Promptly report any lesion that becomes tender, indurated, bleeds, or grows rapidly",
        ],
        "treatment_overview": (
            "Management frequently involves lesion-directed and field-directed therapies. "
            "Lesion-directed methods include liquid nitrogen cryotherapy, curettage, or shave biopsy. "
            "Field cancerization treatments for multiple lesions include topical 5-fluorouracil (5-FU), "
            "imiquimod cream, tirbanibulin ointment, and photodynamic therapy (PDT) with blue/red light activation."
        ),
        "urgency_level": "prompt",
        "sources": [
            "American Academy of Dermatology (AAD) - Actinic Keratosis Guidelines",
            "Skin Cancer Foundation - Actinic Keratosis Overview",
            "DermNet NZ - Actinic Keratosis",
        ],
        "review_status": "published",
        "reviewed_at": "2026-10-21T00:00:00Z",
    },
    "vascular_lesion": {
        "class_key": "vascular_lesion",
        "display_name": "Vascular Lesion (Cherry Angioma / Hemangioma / Pyogenic Granuloma)",
        "overview": (
            "A vascular lesion is a benign proliferation or dilatation of blood vessels in the dermis or subcutaneous tissue. "
            "Common examples include cherry angiomas (small red or purple papules), pyogenic granulomas, venous lakes, and capillary hemangiomas."
        ),
        "risk_factors": [
            "Advancing age (cherry angiomas develop commonly in adults over 30)",
            "Genetic and familial predisposition to vascular proliferations",
            "Hormonal shifts (such as pregnancy or oral contraceptive use)",
            "Minor trauma, chronic skin friction, or localized injury (frequently triggering pyogenic granulomas)",
        ],
        "warning_signs": [
            "Rapid explosive growth over days or weeks (characteristic of pyogenic granulomas)",
            "Recurrent, profuse bleeding triggered by minimal friction or light touch",
            "Dark purple, black, or blue irregular areas that mimic nodular melanoma or pigmented lesions",
            "Pain, ulceration, or surrounding tissue induration",
        ],
        "prevention": [
            "Most benign vascular lesions cannot be prevented, as they are genetic, age-related, or physiological",
            "Protect known angiomas from physical trauma, rubbing, and friction to prevent bleeding",
        ],
        "recommended_actions": [
            "Have the lesion examined by a dermatologist to definitively distinguish it from amelanotic melanoma or vascular malignancies",
            "Seek clinical evaluation if a lesion bleeds repeatedly, grows rapidly, or causes pain",
            "Stable, diagnosed cherry angiomas require no urgent intervention",
        ],
        "treatment_overview": (
            "Benign cherry angiomas and venous lakes do not require treatment unless they become irritated, bleed, "
            "or cause cosmetic concern. Treatment options in a dermatological clinic include electrocautery, "
            "vascular-targeted lasers (such as Pulsed Dye Laser / Nd:YAG), or cryotherapy. "
            "Pyogenic granulomas are typically managed with shave excision and base electrodessication with histopathological confirmation."
        ),
        "urgency_level": "routine",
        "sources": [
            "American Academy of Dermatology (AAD) - Vascular Lesions and Angiomas",
            "DermNet NZ - Cherry Angioma",
            "British Association of Dermatologists - Benign Vascular Proliferations",
        ],
        "review_status": "published",
        "reviewed_at": "2026-10-21T00:00:00Z",
    },
    "dermatofibroma": {
        "class_key": "dermatofibroma",
        "display_name": "Dermatofibroma (Benign Fibrous Histiocytoma)",
        "overview": (
            "A common, benign cutaneous nodule composed of fibroblasts, myofibroblasts, and histiocytic cells. "
            "Dermatofibromas usually appear as firm, slightly elevated or flat, brownish or reddish-tan nodules, "
            "most often on the extremities (particularly the lower legs)."
        ),
        "risk_factors": [
            "Minor skin trauma such as insect bites, superficial puncture wounds, or folliculitis",
            "More common in young to middle-aged adults (ages 20 to 50)",
            "More frequently identified in female patients",
            "Multiple eruptive dermatofibromas can be associated with systemic autoimmune conditions or immunosuppression",
        ],
        "warning_signs": [
            "Positive 'Pinch Test' (dimple sign): lateral compression causes the nodule to dimple downward rather than elevate",
            "Sudden rapid increase in size, spontaneous bleeding, or central ulceration",
            "Marked color changes, multiple irregular shades, or atypical peripheral borders (requiring differentiation from dermatofibrosarcoma protuberans or malignant melanoma)",
        ],
        "prevention": [
            "No established preventive measures exist for idiopathic dermatofibromas",
            "Preventing insect bites and prompt care of minor superficial skin wounds may reduce reactive lesions",
        ],
        "recommended_actions": [
            "Consult a dermatologist for a professional dermoscopic examination to confirm benign diagnosis",
            "Seek assessment if the lesion changes significantly, becomes painful, or bleeds",
            "Asymptomatic, verified dermatofibromas are completely safe to leave alone",
        ],
        "treatment_overview": (
            "Because dermatofibromas are completely benign and extend into the deep subcutaneous tissue, "
            "treatment is generally discouraged unless the lesion is persistently symptomatic or diagnostically uncertain. "
            "If excision is chosen, complete surgical excision is required; simple shave biopsies frequently result in recurrence "
            "and firm scarring. Superficial cryosurgery can sometimes be used to flatten raised lesions."
        ),
        "urgency_level": "routine",
        "sources": [
            "DermNet NZ - Dermatofibroma",
            "American Academy of Dermatology (AAD) - Dermatofibroma Diagnosis",
            "Skin Cancer Foundation - Benign Skin Lesions",
        ],
        "review_status": "published",
        "reviewed_at": "2026-10-21T00:00:00Z",
    },
}


def resolve_class_key(input_identifier: str) -> Optional[str]:
    """Resolve an input identifier (code, name, or key) to a canonical class_key."""
    if not input_identifier or not isinstance(input_identifier, str):
        return None
    cleaned = input_identifier.strip().lower()
    if cleaned in CLASS_MAPPING:
        return CLASS_MAPPING[cleaned]
    # Try normalized spacing
    normalized = cleaned.replace("_", " ").replace("-", " ")
    return CLASS_MAPPING.get(normalized)


def get_guide_by_key(class_key: str, allow_unpublished: bool = False) -> Optional[Dict[str, Any]]:
    """
    Retrieve an educational guide by class key.
    Queries Supabase database table first.
    Falls back gracefully to baseline repository guides if table is unmigrated.
    """
    resolved_key = resolve_class_key(class_key)
    if not resolved_key:
        logger.warning(f"Unrecognized class identifier requested: {class_key}")
        return None

    # 1. Attempt lookup in Supabase
    try:
        query = supabase.table("skin_condition_guides").select("*").eq("class_key", resolved_key)
        if not allow_unpublished:
            query = query.eq("review_status", "published")

        response = query.execute()
        if response and response.data and len(response.data) > 0:
            return response.data[0]
    except Exception as e:
        logger.debug(f"Supabase guide query exception for {resolved_key} (using baseline): {e}")

    # 2. Fallback to baseline verified guide
    baseline = BASELINE_GUIDES.get(resolved_key)
    if not baseline:
        return None

    if not allow_unpublished and baseline.get("review_status") != "published":
        return None

    return baseline


def list_guides(allow_unpublished: bool = False) -> List[Dict[str, Any]]:
    """Retrieve all available educational guides."""
    try:
        query = supabase.table("skin_condition_guides").select("*")
        if not allow_unpublished:
            query = query.eq("review_status", "published")
        response = query.execute()
        if response and response.data and len(response.data) > 0:
            return response.data
    except Exception as e:
        logger.debug(f"Supabase guides list query exception: {e}")

    results = []
    for guide in BASELINE_GUIDES.values():
        if allow_unpublished or guide.get("review_status") == "published":
            results.append(guide)
    return results
