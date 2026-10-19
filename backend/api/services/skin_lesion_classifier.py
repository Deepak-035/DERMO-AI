#This file is used for classification of normal skin and lesion skin images

from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


# Resolve the backend directory from this file's location.
BACKEND_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
        BACKEND_DIR
        / "trained_models"
        / "efficientnet_b0_skin_lesion_best.pth"
)

IMAGE_SIZE = 224
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Skin-lesion model not found: {MODEL_PATH}"
        )

    # This checkpoint was created by your own Colab training notebook.
    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=False,
    )

    model = models.efficientnet_b0(weights=None)

    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, 2)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(DEVICE)
    model.eval()

    class_to_idx = checkpoint["class_to_idx"]
    idx_to_class = {
        int(index): name
        for name, index in class_to_idx.items()
    }

    required_classes = {"normal_skin", "lesion_skin"}

    if set(class_to_idx.keys()) != required_classes:
        raise ValueError(
            f"Unexpected model classes: {class_to_idx}"
        )

    return model, idx_to_class


model, idx_to_class = load_model()


def classify_skin_lesion(image_path: str) -> dict:
    """
    Classify an image that has already passed the skin/non-skin check.

    Returns the predicted class and both class probabilities.
    """
    with Image.open(image_path) as image:
        image = image.convert("RGB")
        image_tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.inference_mode():
        logits = model(image_tensor)
        probabilities = torch.softmax(logits, dim=1)[0]

    predicted_index = int(torch.argmax(probabilities).item())
    predicted_class = idx_to_class[predicted_index]

    probability_by_class = {
        idx_to_class[i]: float(probabilities[i].item())
        for i in range(len(idx_to_class))
    }

    return {
        "predicted_class": predicted_class,
        "normal_skin_probability": probability_by_class["normal_skin"],
        "lesion_skin_probability": probability_by_class["lesion_skin"],
    }