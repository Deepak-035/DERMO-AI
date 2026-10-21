/**
 * Mapping between model-predicted labels/codes and stable backend class_keys.
 * Supports all 7 classification classes of DERMO-AI with safe unknown handling.
 */

export const MODEL_CLASS_TO_KEY: Record<string, string> = {
  // Direct code mappings
  nv: 'melanocytic_nevus',
  mel: 'melanoma',
  bkl: 'benign_keratosis',
  bcc: 'basal_cell_carcinoma',
  akiec: 'actinic_keratoses',
  vasc: 'vascular_lesion',
  df: 'dermatofibroma',

  // Full name mappings (normalized to lowercase)
  'melanocytic nevus': 'melanocytic_nevus',
  'melanocytic nevi': 'melanocytic_nevus',
  'mole': 'melanocytic_nevus',

  'melanoma': 'melanoma',

  'benign keratosis': 'benign_keratosis',
  'benign keratosis-like lesions': 'benign_keratosis',
  'seborrheic keratosis': 'benign_keratosis',
  'solar lentigo': 'benign_keratosis',

  'basal cell carcinoma': 'basal_cell_carcinoma',

  'actinic keratoses': 'actinic_keratoses',
  'actinic keratosis': 'actinic_keratoses',
  'solar keratosis': 'actinic_keratoses',

  'vascular lesion': 'vascular_lesion',
  'vascular lesions': 'vascular_lesion',
  'cherry angioma': 'vascular_lesion',
  'hemangioma': 'vascular_lesion',

  'dermatofibroma': 'dermatofibroma',

  // Direct stable key pass-through
  'melanocytic_nevus': 'melanocytic_nevus',
  'benign_keratosis': 'benign_keratosis',
  'basal_cell_carcinoma': 'basal_cell_carcinoma',
  'actinic_keratoses': 'actinic_keratoses',
  'vascular_lesion': 'vascular_lesion',
};

/**
 * Normalizes input prediction label or code to the canonical backend class_key.
 * Returns null if the label is unmapped, unknown, or a non-lesion condition (e.g. normal_skin).
 *
 * @param labelOrCode - The predicted disease string or short code from the model
 * @returns Stable class_key or null
 */
export function mapModelClassToKey(labelOrCode?: string | null): string | null {
  if (!labelOrCode || typeof labelOrCode !== 'string') {
    return null;
  }

  const normalized = labelOrCode.trim().toLowerCase().replace(/[-_]+/g, ' ');
  const directKey = labelOrCode.trim().toLowerCase();

  // Check direct code/stable key first
  if (MODEL_CLASS_TO_KEY[directKey]) {
    return MODEL_CLASS_TO_KEY[directKey];
  }

  // Check normalized name
  if (MODEL_CLASS_TO_KEY[normalized]) {
    return MODEL_CLASS_TO_KEY[normalized];
  }

  return null;
}
