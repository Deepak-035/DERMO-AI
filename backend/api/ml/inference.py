import torch
from PIL import Image
from api.config import MODEL_PATH
from torchvision import transforms
from api.ml.labels import CLASS_INFO
from api.ml.hybrid_model import HybridCNNTransformer

#Device
device=torch.device("cuda" if torch.cuda.is_available() else "cpu")

#Image preprocessing
transform=transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# Load model
model=HybridCNNTransformer()
model.load_state_dict(torch.load(MODEL_PATH,map_location=device))
model.to(device)
model.eval()

CONFIDENCE_THRESHOLD=0.52

def predict(image_path:str):
    image=Image.open(image_path).convert("RGB")
    image=transform(image)
    image=image.unsqueeze(0).to(device)

    with torch.no_grad():
        outputs=model(image)
        probabilities=torch.softmax(outputs,dim=1)
        confidence,predicted=torch.max(probabilities,dim=1)

    confidence=confidence.item()
    prediction=predicted.item()

    return{
        "prediction":CLASS_INFO[prediction]["name"],
        "code":CLASS_INFO[prediction]["code"],
        "confidence":round(confidence*100,2),
        "low_confidence":confidence<CONFIDENCE_THRESHOLD
    }