# DERMO-AI — Skin Disease Classification using a Hybrid CNN–Transformer Model

DERMO-AI is a deep-learning-based skin disease classification system that combines image validation, sequential image classification models, and a Hybrid CNN–Transformer architecture. The backend uses FastAPI, with Supabase for image and prediction storage.

The system uses three sequential classification stages:

1. **Stage 1 — Skin vs. Non-Skin Classification:** MobileNetV2 determines whether the uploaded image contains skin.
2. **Stage 2 — Normal Skin vs. Lesion-Affected Skin Classification:** EfficientNetB0 classifies skin images as normal-looking skin or lesion-affected skin.
3. **Stage 3 — Skin Disease Classification:** The Hybrid CNN–Transformer model predicts the disease category for images classified as lesion-affected skin.

The purpose of this pipeline is to reject irrelevant uploads early, avoid running disease classification on images classified as normal-looking skin, and reserve the final disease classifier for lesion-positive images.

## Repository Structure

```text
main
├── MP_1
├── MP_2
│   └── Trained_Model
└── MP_2_H
    └── Hybrid_Model
```

The exact directory structure may vary between project branches and deployment configurations.

## Branch Details

### `main`
- Contains the initial project files and earlier implementation.
- Retained for reference purposes.

### `MP_1`
- EfficientNet-B0 CNN with frozen feature extraction.
- Only the classifier layers were trained.
- **Reported test accuracy: 63%.**

### `MP_2`
- EfficientNet-B0 CNN with full fine-tuning.
- All model layers were unfrozen during fine-tuning.
- Represents the improved CNN baseline.
- **Reported test accuracy: 73%.**

### `MP_2_H`
- Proposed Hybrid CNN–Transformer architecture.
- Combines EfficientNet-B0 for local feature extraction with a Transformer Encoder for global feature learning.
- **Reported test accuracy: 79%.**

### `Trained_Model`
- Contains trained weights for the EfficientNet-B0 `MP_2` model.
- **Reported model accuracy: 73%.**

### `Hybrid_Model`
- Contains trained weights for the Hybrid CNN–Transformer `MP_2_H` model.
- **Reported model accuracy: 79%.**

## Model Performance

The following figures are the previously reported results for the skin disease classification models. They should not be interpreted as the measured performance of the newly introduced normal-skin vs. lesion-skin classifier.

| Model | Architecture | Reported Test Accuracy |
|---|---|---:|
| MP_1 | EfficientNet-B0, frozen feature extraction | 63% |
| MP_2 | EfficientNet-B0, full fine-tuning | 73% |
| MP_2_H | Hybrid CNN–Transformer | **79%** |

## Project Highlights

- Skin disease classification using the HAM10000 dataset.
- Transfer learning with EfficientNet-B0.
- Full fine-tuning for improved CNN performance.
- Hybrid CNN–Transformer architecture.
- Class-weighted Cross Entropy Loss.
- AdamW optimizer.
- Learning-rate scheduling.
- Image validation and quality checks.
- Sequential classification pipeline.
- FastAPI-based prediction API.
- Supabase image storage and prediction persistence.
- Docker-based backend containerization.
- Google Cloud Run backend deployment.
- Vercel frontend deployment.

### Model Evaluation

Model evaluation includes:

- Classification report.
- Confusion matrix.
- ROC curve.
- Precision–recall curve.
- Misclassified image analysis.
- Accuracy, precision, recall, F1-score and other relevant metrics, where measured.

## Classification Pipeline

```text
Uploaded Image
      |
      v
Image Validation
      |
      v
Stage 1: MobileNetV2
Skin vs. Non-Skin
      |
      +---- Non-Skin
      |        |
      |        v
      |   Reject Upload
      |
      v
Stage 2: EfficientNetB0
Normal Skin vs. Lesion Skin
      |
      +---- Normal-Looking Skin
      |        |
      |        v
      |   Return Classification
      |   Skip Disease Prediction
      |
      v
Stage 3: Hybrid CNN–Transformer
Skin Disease Classification
      |
      v
Prediction Result
      |
      v
Supabase Image Storage
and Prediction Storage
```

### Stage 1 — Skin vs. Non-Skin Classification

**Model:** MobileNetV2

The first stage determines whether the uploaded image is classified as skin or non-skin.

- Uses the trained MobileNetV2 model.
- Produces skin and non-skin probabilities.
- Applies a configured classification threshold.
- Rejects images classified as non-skin before proceeding to subsequent stages.

### Stage 2 — Normal Skin vs. Lesion-Affected Skin

**Model:** EfficientNetB0

The second stage classifies images that have passed Stage 1 into two classes:

| Class | Description |
|---|---|
| `normal_skin` | Image classified as normal-looking skin |
| `lesion_skin` | Image classified as lesion-affected skin |

The model is trained using transfer learning from ImageNet-pretrained EfficientNetB0 and a two-class classification head.

The training workflow includes:

- Dataset preparation and label filtering.
- Image deduplication.
- Case-level train, validation and test splitting.
- Image augmentation for training.
- Class-weighted Cross Entropy Loss.
- AdamW optimization.
- Learning-rate scheduling.
- Early stopping based on validation loss.
- Best-checkpoint saving.
- Evaluation using accuracy, precision, recall, F1-score, ROC-AUC and a confusion matrix.

The model checkpoint and training outputs are stored in Google Drive.

**Inference behavior:**
- If the image is classified as `normal_skin`, the pipeline returns the classification without running the disease classifier.
- If the image is classified as `lesion_skin`, the pipeline continues to Stage 3.

The model's predictions are image classifications, not medical confirmation that skin is healthy or diseased.

### Stage 3 — Skin Disease Classification

**Model:** Hybrid CNN–Transformer

The final stage classifies lesion-positive images into the disease categories supported by the trained model.

The architecture combines:

- EfficientNet-B0 for local visual feature extraction.
- Transformer Encoder layers for global feature learning.
- A classification head for disease prediction.

The existing inference module returns the predicted disease category, its associated code and the model's confidence value.

The reported test accuracy for this model is 79%, as documented in the existing project results.

## Backend Technologies

| Technology | Purpose |
|---|---|
| Python | Backend and machine-learning implementation |
| FastAPI | REST API and image-prediction endpoints |
| PyTorch | Model loading and inference |
| Torchvision | Model architectures and image transformations |
| MobileNetV2 | Stage 1 skin/non-skin classifier |
| EfficientNetB0 | Stage 2 normal-skin/lesion-skin classifier |
| Hybrid CNN–Transformer | Stage 3 disease classifier |
| Pillow | Image loading and validation |
| OpenCV | Image quality checks and blur detection |
| Pydantic | Request and response validation |
| Supabase | Database and image storage |
| Docker | Backend containerization |
| Google Artifact Registry | Container image storage |
| Google Cloud Run | Backend deployment |
| Google Secret Manager | Deployment secrets |
| React and Vite | Frontend application |
| Vercel | Frontend deployment |

## Backend Features

### Image Upload and Validation

The prediction pipeline validates uploaded images before classification. Validation includes:

- Image integrity checks.
- Minimum resolution warnings.
- High-resolution warnings.
- Brightness checks.
- Blur detection.
- Invalid or corrupted image handling.

These checks help identify potential image-quality problems. Quality warnings do not guarantee that an image is suitable for medical interpretation.

### Prediction API

The FastAPI backend coordinates all three classification stages.

The pipeline returns structured prediction information, including applicable classification probabilities, prediction results and warnings.

The response depends on the stage at which processing stops. Non-skin images are rejected at Stage 1, normal-looking skin images return at Stage 2, and lesion-positive images proceed to Stage 3.

### Supabase Integration

For completed disease predictions, the backend:

- Uploads the image to Supabase Storage.
- Stores the prediction, associated code, confidence and image URL in the predictions table.
- Returns the prediction result to the frontend.

The current pipeline returns early for non-skin and normal-looking skin classifications. Those early-return paths do not perform the same image-upload and disease-prediction database operations as the final disease-classification path.

## Trained Models

The project uses three models in the inference pipeline:

| Stage | Model | Task |
|---|---|---|
| Stage 1 | MobileNetV2 | Skin vs. non-skin |
| Stage 2 | EfficientNetB0 | Normal skin vs. lesion-affected skin |
| Stage 3 | Hybrid CNN–Transformer | Skin disease classification |

The backend requires the corresponding trained checkpoints to be present at the configured model paths.

The Stage 2 EfficientNetB0 checkpoint is produced by the Google Colab training workflow. Its class mapping must be loaded from the checkpoint to ensure that model output indices correspond to the correct class names.

## Deployment

The project deployment workflow uses:

- Docker for containerizing the FastAPI backend.
- Google Artifact Registry for storing backend container images.
- Google Cloud Run for hosting the backend API.
- Google Secret Manager for sensitive deployment configuration.
- Vercel for frontend hosting.
- Supabase for database and image storage.

When updating a trained model, the new checkpoint must be included in the backend build and deployed with the updated application code. The deployed service should be tested to verify that all three stages load and execute correctly.

## Current Project Status

### Machine Learning
- [x] Skin disease classification architecture.
- [x] Dataset preparation for the original disease classifier.
- [x] EfficientNet-B0 CNN baseline development.
- [x] Hybrid CNN–Transformer model development.
- [x] Stage 1 skin/non-skin classifier.
- [x] Stage 1 MobileNetV2 training and evaluation.
- [x] Stage 2 normal-skin/lesion-skin classifier development.
- [x] EfficientNetB0 Stage 2 model training.
- [x] Training history and evaluation output generation.

### Backend
- [x] FastAPI backend.
- [x] Image upload API.
- [x] Image validation and quality checks.
- [x] Sequential three-stage prediction pipeline implementation.
- [x] Pydantic prediction response schema.
- [x] Supabase integration.
- [x] Image storage integration.
- [x] Prediction storage for completed disease predictions.

### Frontend and Deployment
- [x] React and Vite frontend.
- [x] Frontend-backend API communication.
- [x] Docker containerization.
- [x] Google Artifact Registry setup.
- [x] Google Cloud Run deployment.
- [x] Google Secret Manager integration.
- [x] Vercel frontend deployment.
- [x] Local FastAPI testing.
- [x] Production API deployment.

> Status checkboxes reflect the project status documented by the project team. The latest deployment should still be tested after integrating the new model checkpoint.

## Limitations

DERMO-AI is a research and academic project. Its classification outputs should not be treated as medical diagnoses.

The normal-skin vs. lesion-skin classifier depends on the quality and representativeness of its training labels and images. A prediction of `normal_skin` does not rule out skin disease, and a prediction of `lesion_skin` does not establish a particular diagnosis.

Reported model accuracies are specific to their respective evaluation datasets and should not be assumed to represent performance on all real-world images.
