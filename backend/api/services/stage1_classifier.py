import torch
import torch.nn as nn

from pathlib import Path
from PIL import Image
from torchvision import models, transforms


# ============================================================
# Configuration
# ============================================================

MODEL_PATH = Path(
    "trained_models/stage1_mobilenetv2_best.pth"
)

IMAGE_SIZE = 224
SKIN_THRESHOLD = 0.50

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# Image preprocessing
# Must match Stage 1 training preprocessing
# ============================================================

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ============================================================
# Load checkpoint
# ============================================================

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE
)


# ============================================================
# Recreate MobileNetV2
# ============================================================

model = models.mobilenet_v2(
    weights=None
)

model.classifier[1] = nn.Linear(
    model.last_channel,
    2
)


# Load trained weights
model.load_state_dict(
    checkpoint["model_state_dict"]
)

model.to(DEVICE)
model.eval()


# ============================================================
# Stage 1 prediction
# ============================================================

def classify_skin(image_path: str):

    image = Image.open(
        image_path
    ).convert("RGB")

    image_tensor = transform(image)

    image_tensor = image_tensor.unsqueeze(0)

    image_tensor = image_tensor.to(DEVICE)

    with torch.no_grad():

        output = model(image_tensor)

        probabilities = torch.softmax(
            output,
            dim=1
        )[0]

    # Training class order:
    # 0 = non_skin
    # 1 = skin

    non_skin_probability = (
        probabilities[0].item()
    )

    skin_probability = (
        probabilities[1].item()
    )

    is_skin = (
            skin_probability >= SKIN_THRESHOLD
    )

    return {
        "is_skin": is_skin,
        "predicted_class": (
            "skin"
            if is_skin
            else "non_skin"
        ),
        "skin_probability": skin_probability,
        "non_skin_probability": non_skin_probability,
        "threshold": SKIN_THRESHOLD
    }