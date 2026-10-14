import os
import cv2
from api.logger import logger
from fastapi import HTTPException
from api.ml.inference import predict
from api.supabase_client import supabase
from PIL import Image, UnidentifiedImageError
from api.services.storage_service import upload_image
from api.services.stage1_classifier import classify_skin

def predict_image(image_path:str,filename:str):
    logger.info(f"Starting prediction for {filename}")
    warnings=[]

    #Image Validation
    try:
        #Verify uploaded image
        with Image.open(image_path) as img:
            img.verify()

        #Reopen image for further validations
        with Image.open(image_path) as img:
            width,height=img.size

            # Resolution Validation
            MIN_WIDTH=128
            MIN_HEIGHT=128
            MAX_WIDTH=5000
            MAX_HEIGHT=5000

            if width<MIN_WIDTH or height<MIN_HEIGHT:
                warnings.append("⚠️Low-resolution image detected. Prediction accuracy and confidence may be reduced.")

            if width>MAX_WIDTH or height>MAX_HEIGHT:
                warnings.append("⚠️Very high-resolution image detected. The image will be resized before prediction.")

            # Brightness Validation
            gray=img.convert("L")
            pixels=list(gray.getdata())
            average_brightness=sum(pixels) / len(pixels)

            MIN_BRIGHTNESS=22
            MAX_BRIGHTNESS=222

            if average_brightness<MIN_BRIGHTNESS:
                warnings.append("⚠️Image appears too dark. Prediction accuracy and confidence may be reduced.")

            if average_brightness>MAX_BRIGHTNESS:
                warnings.append("⚠️Image appears overexposed (too bright). Prediction accuracy and confidence may be reduced.")

        # Blur Detection
        image=cv2.imread(image_path)

        if image is None:
            raise HTTPException(
                status_code=400,
                detail="Unable to read uploaded image."
            )

        gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
        blur_score=cv2.Laplacian(
            gray,
            cv2.CV_64F
        ).var()

        BLUR_THRESHOLD=100
        if blur_score<BLUR_THRESHOLD:
            warnings.append("⚠️Image appears blurry. Prediction accuracy and confidence may be reduced.")

    except (UnidentifiedImageError,OSError):
        logger.exception("Invalid or corrupted image.")

        raise HTTPException(
            status_code=400,
            detail="⚠️The uploaded file is not a valid image or is corrupted."
        )

    # ============================================================
    # Prediction Pipeline
    # ============================================================

    try:
        logger.info("Running Stage 1 skin/non-skin classification...")

    # --------------------------------------------------------
    # Stage 1: Skin / Non-Skin Classification
    # --------------------------------------------------------

        stage1_result = classify_skin(image_path)

        logger.info(
            f"Stage 1 result: "
            f"{stage1_result['predicted_class']} | "
            f"skin_probability="
            f"{stage1_result['skin_probability']:.4f}"
        )

    # --------------------------------------------------------
    # Reject non-skin images
    # --------------------------------------------------------

        if not stage1_result["is_skin"]:

            logger.info(
                "Stage 1 rejected image as non-skin."
            )

            return {
                "success": False,
                "message": "It appears to not be a lesion image. Please upload relevant images only.",
                "filename": filename,
                "stage": 1,
                "result": {
                    "classification": "non_skin",
                    "skin_probability": stage1_result[
                        "skin_probability"
                    ],
                    "non_skin_probability": stage1_result[
                        "non_skin_probability"
                    ],
                    "threshold": stage1_result[
                        "threshold"
                    ]
                },
                "warnings": warnings
            }

    # --------------------------------------------------------
    # Stage 1 passed → Stage 2
    # --------------------------------------------------------

        logger.info(
        "Stage 1 passed. Running Stage 2 disease classification..."
        )

    # Existing 7-class disease prediction
        result = predict(image_path)

    # Low confidence warning
        if result.pop("low_confidence"):
            warnings.append(
                "⚠️The model has low confidence in this prediction. "
                "Please upload a clearer skin lesion image for better accuracy."
            )

        logger.info(
            "Prediction completed successfully."
        )
        logger.info("Prediction completed successfully.")

        #Upload image
        logger.info("Uploading image to Supabase Storage...")

        image_url=upload_image(
                image_path,
                filename
            )

        #Save prediction
        logger.info("Saving prediction to database...")
        supabase.table("predictions").insert({
                "filename":filename,
                "image_url":image_url,
                "prediction":result["prediction"],
                "code":result["code"],
                "confidence":result["confidence"]
            }).execute()
        logger.info("Prediction saved successfully.")

        return{
                "success":True,
                "message":"Prediction completed successfully.",
                "filename":filename,
                "result":{
                    "prediction":result["prediction"],
                    "code":result["code"],
                    "confidence":result["confidence"],
                    "image_url":image_url
                },
                "warnings":warnings
            }

    except Exception as e:
            logger.exception(f"Prediction failed: {e}")

            raise HTTPException(
                status_code=500,
                detail=f"Prediction failed: {str(e)}"
        )

    finally:
            # Delete temporary image
            if os.path.exists(image_path):
                os.remove(image_path)
                logger.info("Temporary file deleted.")