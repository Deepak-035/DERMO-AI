-- ==============================================================================
-- DERMO-AI: Skin Condition Educational Guides Migration
-- Migration: 20261021_skin_condition_guides.sql
-- ==============================================================================

-- 1. SKIN CONDITION GUIDES TABLE
CREATE TABLE IF NOT EXISTS public.skin_condition_guides (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    overview TEXT NOT NULL,
    risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    warning_signs JSONB NOT NULL DEFAULT '[]'::jsonb,
    prevention JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    treatment_overview TEXT NOT NULL,
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('routine', 'prompt', 'urgent')),
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'reviewed', 'published')),
    reviewed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by class_key and review_status
CREATE INDEX IF NOT EXISTS idx_skin_condition_guides_class_key ON public.skin_condition_guides(class_key);
CREATE INDEX IF NOT EXISTS idx_skin_condition_guides_status ON public.skin_condition_guides(review_status);

-- 2. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.skin_condition_guides ENABLE ROW LEVEL SECURITY;

-- 2A. SELECT Policy: Authenticated users can view published guides; Admins can view all (draft/reviewed/published)
DROP POLICY IF EXISTS "Guides read access authenticated" ON public.skin_condition_guides;
CREATE POLICY "Guides read access authenticated" ON public.skin_condition_guides
    FOR SELECT TO authenticated
    USING (
        review_status = 'published' OR public.is_admin(auth.uid())
    );

-- 2B. SELECT Policy: Anon users can also view published guides if browsing public screening
DROP POLICY IF EXISTS "Guides read access anon" ON public.skin_condition_guides;
CREATE POLICY "Guides read access anon" ON public.skin_condition_guides
    FOR SELECT TO anon
    USING (
        review_status = 'published'
    );

-- 2C. INSERT Policy: Admin only
DROP POLICY IF EXISTS "Guides insertable by admin only" ON public.skin_condition_guides;
CREATE POLICY "Guides insertable by admin only" ON public.skin_condition_guides
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin(auth.uid())
    );

-- 2D. UPDATE Policy: Admin only
DROP POLICY IF EXISTS "Guides updatable by admin only" ON public.skin_condition_guides;
CREATE POLICY "Guides updatable by admin only" ON public.skin_condition_guides
    FOR UPDATE TO authenticated
    USING (
        public.is_admin(auth.uid())
    )
    WITH CHECK (
        public.is_admin(auth.uid())
    );

-- 2E. DELETE Policy: Admin only
DROP POLICY IF EXISTS "Guides deletable by admin only" ON public.skin_condition_guides;
CREATE POLICY "Guides deletable by admin only" ON public.skin_condition_guides
    FOR DELETE TO authenticated
    USING (
        public.is_admin(auth.uid())
    );

-- 3. SEED THE SEVEN CLASSIFICATION CLASSES
-- All records are backed by reputable dermatological sources (AAD, NCI, DermNet NZ, Skin Cancer Foundation)
-- Using dollar quotes $$...$$ to ensure valid PostgreSQL syntax without quote-escape errors
INSERT INTO public.skin_condition_guides (
    class_key,
    display_name,
    overview,
    risk_factors,
    warning_signs,
    prevention,
    recommended_actions,
    treatment_overview,
    urgency_level,
    sources,
    review_status,
    reviewed_at
) VALUES
(
    'melanocytic_nevus',
    'Melanocytic Nevus (Common Mole)',
    $$A benign proliferation of melanocytes (pigment-producing cells). Melanocytic nevi are common skin growths that usually present as uniform, well-circumscribed, brown or tan macules, papules, or plaques.$$,
    $$["Fair skin and light hair (Fitzpatrick types I and II)", "Cumulative childhood and adolescent sun exposure", "Family history of numerous or atypical moles", "Genetic factors predisposing to melanocytic proliferation"]$$::jsonb,
    $$["Asymmetry in shape or elevation", "Irregular, notched, or scalloped borders", "Color variations within the mole (dark brown, black, blue, pink)", "Diameter greater than 6 mm (approx. pencil eraser size)", "Evolution or changes in size, shape, surface elevation, bleeding, or persistent itching (ABCDE rule)"]$$::jsonb,
    $$["Apply broad-spectrum sunscreen (SPF 30+) daily to sun-exposed areas", "Avoid peak ultraviolet radiation hours (10:00 AM to 4:00 PM)", "Wear ultraviolet-protective clothing, broad-brimmed hats, and sunglasses", "Perform monthly full-body skin self-checks to monitor existing moles"]$$::jsonb,
    $$["Continue regular monthly skin self-examinations using ABCDE criteria", "Consult a dermatologist if any mole changes, bleeds, itches, or appears newly atypical", "Schedule an annual routine dermatological skin examination if you have multiple or atypical moles"]$$::jsonb,
    $$Common benign nevi require no medical treatment. If a nevus exhibits suspicious clinical features or undergoes changes, complete surgical excision with histopathological analysis is recommended to rule out dysplasia or malignancy. Shave or punch excisions may be considered based on clinical evaluation.$$,
    'routine',
    $$["American Academy of Dermatology (AAD) - Moles: Overview and ABCDEs", "DermNet NZ - Melanocytic Naevi", "Skin Cancer Foundation - About Moles"]$$::jsonb,
    'published',
    NOW()
),
(
    'melanoma',
    'Melanoma',
    $$Melanoma is an aggressive form of skin cancer arising from malignant transformation of melanocytes. While less common than non-melanoma skin cancers, it is responsible for the vast majority of skin cancer deaths. Early detection and prompt surgical intervention are paramount.$$,
    $$["History of intense, blistering sunburns (especially during childhood or adolescence)", "Excessive ultraviolet (UV) radiation from sunlight or artificial tanning beds", "Having more than 50 common moles or presence of atypical (dysplastic) nevi", "Personal or first-degree family history of melanoma", "Fair complexion, light hair (red or blonde), light eye color, and freckling tendency", "Immunosuppression or immunocompromising medical conditions"]$$::jsonb,
    $$["ABCDE criteria: Asymmetry (one half does not match the other)", "Border irregularity (ragged, notched, or blurred borders)", "Color variegation (multiple shades of brown, black, red, white, or blue)", "Diameter larger than 6 mm (though early melanomas can be smaller)", "Evolving size, shape, color, or symptoms (rapid enlargement, elevation, firmness, ulceration, spontaneous bleeding)", "The 'Ugly Duckling' sign: a lesion that looks conspicuously different from all surrounding moles"]$$::jsonb,
    $$["Strict sun avoidance and daily application of broad-spectrum SPF 30+ sunscreen", "Complete avoidance of indoor tanning booths and UV tanning lamps", "Wear tightly woven, UV-protective clothing and UV400-rated sunglasses", "Schedule prompt professional skin screenings for high-risk individuals"]$$::jsonb,
    $$["Seek immediate, urgent clinical evaluation by a board-certified dermatologist or surgical oncologist", "Do not attempt any home removal, destructive creams, or non-prescription treatments", "A diagnostic full-thickness excisional biopsy with narrow margins should be performed for definitive histopathological diagnosis and Breslow thickness measurement"]$$::jsonb,
    $$Primary treatment is wide local surgical excision with margins determined by histological Breslow depth. Depending on pathological staging, sentinel lymph node biopsy, imaging, targeted therapies (such as BRAF/MEK inhibitors), immunotherapy (immune checkpoint inhibitors), or radiation therapy may be prescribed by an oncology multidisciplinary team.$$,
    'urgent',
    $$["National Comprehensive Cancer Network (NCCN) Guidelines - Melanoma: Cutaneous", "American Academy of Dermatology (AAD) - Melanoma Clinical Guidelines", "National Cancer Institute (NCI) - Melanoma Treatment Protocol"]$$::jsonb,
    'published',
    NOW()
),
(
    'benign_keratosis',
    'Benign Keratosis (Seborrheic Keratosis / Solar Lentigo)',
    $$A harmless, non-cancerous skin growth that typically appears with advancing age. Seborrheic keratoses commonly look like waxy, scaly, or 'stuck-on' raised plaques, while solar lentigines present as smooth, flat pigmented sun spots.$$,
    $$["Advancing age (most commonly observed after age 40 to 50)", "Genetic predisposition and strong family history of seborrheic keratoses", "Cumulative lifetime exposure to solar radiation (especially for solar lentigines)", "Fair skin complexion"]$$::jsonb,
    $$["Sudden rapid enlargement or conspicuous darkening of an existing lesion", "Irregular borders or multiple colors that closely mimic melanoma", "Frequent irritation, redness, bleeding, or snagging against jewelry and clothing", "Eruptive sudden onset of dozens of lesions within a short timeframe (Leser-Trélat sign), which warrants prompt clinical investigation"]$$::jsonb,
    $$["Consistent sun protection and sunscreen usage help prevent solar lentigines and photoaging", "Seborrheic keratoses are primarily genetically driven and age-related, with no known preventive lifestyle measures"]$$::jsonb,
    $$["Consult a healthcare professional or dermatologist to verify that atypical lesions are benign and not a disguised malignancy", "Seek evaluation if a keratosis becomes persistently inflamed, itchy, or bleeds", "Routine observation is medically sufficient for asymptomatic, confirmed benign lesions"]$$::jsonb,
    $$Medical treatment is strictly optional and not medically required unless lesions cause physical discomfort, recurrent trauma, or cosmetic concern. When indicated, common office procedures include cryotherapy with liquid nitrogen, light curettage, electrodessication, or superficial shave excision.$$,
    'routine',
    $$["American Academy of Dermatology (AAD) - Seborrheic Keratoses", "DermNet NZ - Seborrhoeic Keratosis", "Mayo Clinic - Seborrheic Keratosis Diagnosis and Care"]$$::jsonb,
    'published',
    NOW()
),
(
    'basal_cell_carcinoma',
    'Basal Cell Carcinoma (BCC)',
    $$Basal Cell Carcinoma is the most prevalent form of human skin cancer. It originates in the basal cell layer of the epidermis. BCC is typically slow-growing and exceptionally rarely metastasizes to distant organs, but if untreated, it can cause extensive local tissue destruction and ulceration.$$,
    $$["Chronic, cumulative ultraviolet (UV) radiation from sunlight or tanning devices", "Frequent blistering sunburns throughout childhood or young adulthood", "Fair skin (Fitzpatrick types I and II), light eyes, and freckles", "History of previous skin cancers or occupational sun exposure", "Previous ionizing radiation therapy or chronic medical immunosuppression", "Inherited genetic syndromes (such as Gorlin-Goltz syndrome)"]$$::jsonb,
    $$["Pearly, translucent, or pinkish bump with tiny visible branching blood vessels (telangiectasias)", "A non-healing sore or ulcer that recurrently bleeds, oozes, crusts, and re-opens over 3 to 4 weeks", "A shiny, firm, pink or red patch, often occurring on the chest or shoulders", "A scar-like, pale, waxy, or yellowish flat area with poorly demarcated borders (morpheaform subtype)"]$$::jsonb,
    $$["Apply water-resistant broad-spectrum sunscreen (SPF 30 or higher) daily 15 minutes before sun exposure", "Avoid tanning beds and minimize direct sun exposure between 10:00 AM and 4:00 PM", "Wear protective headgear, UV-blocking sunglasses, and sun-protective clothing", "Schedule regular clinical skin evaluations with a dermatologist"]$$::jsonb,
    $$["Schedule a prompt medical appointment with a dermatologist for dermoscopy and evaluation", "A skin biopsy is required to confirm histological subtype (nodular, superficial, morpheaform, or infiltrative)", "Plan definitive treatment in a timely manner to prevent deeper tissue, nerve, or cartilage involvement"]$$::jsonb,
    $$Treatment selection depends on anatomical location, histological subtype, and tumor size. Mohs micrographic surgery offers the highest cure rate, especially on cosmetically sensitive or high-risk facial zones. Standard surgical excision with clear margin verification, curettage and electrodessication, topical immunomodulators (imiquimod/5-FU for superficial BCC), and targeted Hedgehog pathway inhibitors for advanced cases are also utilized.$$,
    'prompt',
    $$["Skin Cancer Foundation - Basal Cell Carcinoma Overview & Guidelines", "American Academy of Dermatology (AAD) - Basal Cell Carcinoma Clinical Guidelines", "National Comprehensive Cancer Network (NCCN) - Basal Cell Skin Cancer"]$$::jsonb,
    'published',
    NOW()
),
(
    'actinic_keratoses',
    'Actinic Keratoses (Solar Keratosis / Pre-cancerous Lesion)',
    $$Actinic Keratosis is a common pre-cancerous cutaneous lesion caused by chronic ultraviolet radiation damage. It affects the keratinocytes in the epidermis and has a documented potential to progress to invasive Cutaneous Squamous Cell Carcinoma (cSCC) if left untreated.$$,
    $$["Cumulative lifetime exposure to solar ultraviolet (UV) radiation", "Fitzpatrick skin phototypes I and II (fair skin, red or blonde hair, blue or green eyes)", "Age 40 and older, with increasing frequency in elderly populations", "Living in geographic areas with high UV index or high altitudes", "History of frequent or severe sunburns", "Immunosuppressed individuals (including solid organ transplant recipients)"]$$::jsonb,
    $$["Rough, dry, scaly, or sandpaper-like patch that is often easier to feel than to see", "Persistent erythema, stinging, tenderness, or burning in sun-exposed areas", "Thickened, hyperkeratotic plaque or cutaneous horn formation", "Rapid growth, marked tenderness, induration, or ulceration (which signals possible progression to invasive squamous cell carcinoma)"]$$::jsonb,
    $$["Rigorous, lifelong sun protection: broad-spectrum SPF 30+ applied every two hours outdoors", "Avoid sunbathing and completely avoid artificial UV tanning appliances", "Wear broad-brimmed hats, UV-protective long sleeves, and neck coverage", "Undergo routine full-body skin surveillance by a dermatologist"]$$::jsonb,
    $$["Schedule a prompt clinical consultation with a dermatologist for thorough evaluation", "Ensure evaluation of adjacent sun-damaged skin (field cancerization)", "Promptly report any lesion that becomes tender, indurated, bleeds, or grows rapidly"]$$::jsonb,
    $$Management frequently involves lesion-directed and field-directed therapies. Lesion-directed methods include liquid nitrogen cryotherapy, curettage, or shave biopsy. Field cancerization treatments for multiple lesions include topical 5-fluorouracil (5-FU), imiquimod cream, tirbanibulin ointment, and photodynamic therapy (PDT) with blue/red light activation.$$,
    'prompt',
    $$["American Academy of Dermatology (AAD) - Actinic Keratosis Guidelines", "Skin Cancer Foundation - Actinic Keratosis Overview", "DermNet NZ - Actinic Keratosis"]$$::jsonb,
    'published',
    NOW()
),
(
    'vascular_lesion',
    'Vascular Lesion (Cherry Angioma / Hemangioma / Vascular Malformation)',
    $$A vascular lesion is a benign proliferation or dilatation of blood vessels in the dermis or subcutaneous tissue. Common examples include cherry angiomas (small red or purple papules), pyogenic granulomas, venous lakes, and capillary hemangiomas.$$,
    $$["Advancing age (cherry angiomas develop commonly in adults over 30)", "Genetic and familial predisposition to vascular proliferations", "Hormonal shifts (such as pregnancy or oral contraceptive use)", "Minor trauma, chronic skin friction, or localized injury (frequently triggering pyogenic granulomas)"]$$::jsonb,
    $$["Rapid explosive growth over days or weeks (characteristic of pyogenic granulomas)", "Recurrent, profuse bleeding triggered by minimal friction or light touch", "Dark purple, black, or blue irregular areas that mimic nodular melanoma or pigmented lesions", "Pain, ulceration, or surrounding tissue induration"]$$::jsonb,
    $$["Most benign vascular lesions cannot be prevented, as they are genetic, age-related, or physiological", "Protect known angiomas from physical trauma, rubbing, and friction to prevent bleeding"]$$::jsonb,
    $$["Have the lesion examined by a dermatologist to definitively distinguish it from amelanotic melanoma or vascular malignancies", "Seek clinical evaluation if a lesion bleeds repeatedly, grows rapidly, or causes pain", "Stable, diagnosed cherry angiomas require no urgent intervention"]$$::jsonb,
    $$Benign cherry angiomas and venous lakes do not require treatment unless they become irritated, bleed, or cause cosmetic concern. Treatment options in a dermatological clinic include electrocautery, vascular-targeted lasers (such as Pulsed Dye Laser / Nd:YAG), or cryotherapy. Pyogenic granulomas are typically managed with shave excision and base electrodessication with histopathological confirmation.$$,
    'routine',
    $$["American Academy of Dermatology (AAD) - Vascular Lesions and Angiomas", "DermNet NZ - Cherry Angioma", "British Association of Dermatologists - Benign Vascular Proliferations"]$$::jsonb,
    'published',
    NOW()
),
(
    'dermatofibroma',
    'Dermatofibroma (Benign Fibrous Histiocytoma)',
    $$A common, benign cutaneous nodule composed of fibroblasts, myofibroblasts, and histiocytic cells. Dermatofibromas usually appear as firm, slightly elevated or flat, brownish or reddish-tan nodules, most often on the extremities (particularly the lower legs).$$,
    $$["Minor skin trauma such as insect bites, superficial puncture wounds, or folliculitis", "More common in young to middle-aged adults (ages 20 to 50)", "More frequently identified in female patients", "Multiple eruptive dermatofibromas can be associated with systemic autoimmune conditions or immunosuppression"]$$::jsonb,
    $$["Positive 'Pinch Test' (dimple sign): lateral compression causes the nodule to dimple downward rather than elevate", "Sudden rapid increase in size, spontaneous bleeding, or central ulceration", "Marked color changes, multiple irregular shades, or atypical peripheral borders (requiring differentiation from dermatofibrosarcoma protuberans or malignant melanoma)"]$$::jsonb,
    $$["No established preventive measures exist for idiopathic dermatofibromas", "Preventing insect bites and prompt care of minor superficial skin wounds may reduce reactive lesions"]$$::jsonb,
    $$["Consult a dermatologist for a professional dermoscopic examination to confirm benign diagnosis", "Seek assessment if the lesion changes significantly, becomes painful, or bleeds", "Asymptomatic, verified dermatofibromas are completely safe to leave alone"]$$::jsonb,
    $$Because dermatofibromas are completely benign and extend into the deep subcutaneous tissue, treatment is generally discouraged unless the lesion is persistently symptomatic or diagnostically uncertain. If excision is chosen, complete surgical excision is required; simple shave biopsies frequently result in recurrence and firm scarring. Superficial cryosurgery can sometimes be used to flatten raised lesions.$$,
    'routine',
    $$["DermNet NZ - Dermatofibroma", "American Academy of Dermatology (AAD) - Dermatofibroma Diagnosis", "Skin Cancer Foundation - Benign Skin Lesions"]$$::jsonb,
    'published',
    NOW()
)
ON CONFLICT (class_key) DO UPDATE
SET
    display_name = EXCLUDED.display_name,
    overview = EXCLUDED.overview,
    risk_factors = EXCLUDED.risk_factors,
    warning_signs = EXCLUDED.warning_signs,
    prevention = EXCLUDED.prevention,
    recommended_actions = EXCLUDED.recommended_actions,
    treatment_overview = EXCLUDED.treatment_overview,
    urgency_level = EXCLUDED.urgency_level,
    sources = EXCLUDED.sources,
    review_status = EXCLUDED.review_status,
    reviewed_at = EXCLUDED.reviewed_at,
    updated_at = NOW();
