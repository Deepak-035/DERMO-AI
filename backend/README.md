# Skin Disease Classification using a Hybrid CNN–Transformer Model

This repository contains the implementation of a **Skin Disease Classification** system using deep learning. The project explores the performance of a baseline **EfficientNet-B0 CNN** model and a proposed **Hybrid CNN–Transformer** architecture.

## Repository Structure

```
main
├── MP_1
├── MP_2
│   └── Trained_Model
└── MP_2_H
    └── Hybrid_Model
```

## Branch Details

### `main`
- Contains the initial project files and earlier implementation.
- Retained for reference purposes only.
- No use of it.

### `MP_1`
- EfficientNet-B0 (CNN) with **Frozen Feature Extraction**.
- Only the classifier layers were trained.
- **Test Accuracy:** **63%**

### `MP_2`
- EfficientNet-B0 (CNN) with **Full Fine-Tuning** (all layers unfrozen).
- Represents the improved CNN baseline.
- **Test Accuracy:** **73%**

### `MP_2_H`
- Proposed **Hybrid CNN–Transformer** architecture.
- Combines EfficientNet-B0 (the same `MP_2` code)for local feature extraction with a Transformer Encoder (code) for global feature learning.
- **Test Accuracy:** **79%**

### `Trained_Model`
- Contains the trained weights (`.pth`) for the EfficientNet-B0 `MP_2` model.
- **Model Accuracy:** **73%**

### `Hybrid_Model`
- Contains the trained weights (`.pth`) for the Hybrid CNN–Transformer `MP_2_H` model.
- **Model Accuracy:** **79**

---

## Model Performance

| Model  |                Architecture                 | Test Accuracy |
|--------|---------------------------------------------|--------------:|
| MP_1   | EfficientNet-B0 (Frozen Feature Extraction) | 63%           |
| MP_2   | EfficientNet-B0 (Full Fine-Tuning)          | 73%           |
| MP_2_H | Hybrid CNN–Transformer                      | **79%**       |

---

## Project Highlights

- Skin Disease Classification using the HAM10000 dataset
- Transfer Learning with EfficientNet-B0
- Full Fine-Tuning for improved performance
- Hybrid CNN–Transformer architecture
- Class-weighted Cross Entropy Loss
- AdamW Optimizer
- Learning Rate Scheduling
- Comprehensive model evaluation using:
  - Classification Report
  - Confusion Matrix
  - ROC Curve
  - Precision–Recall Curve
  - Misclassified Image Analysis

---

## Trained Models

The repository includes the trained model weights for:

- EfficientNet-B0 (Full Fine-Tuning)
- Hybrid CNN–Transformer

These models can be directly loaded for inference or deployment without retraining.

---
