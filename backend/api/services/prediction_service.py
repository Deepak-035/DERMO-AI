import os
from api.logger import logger
from api.ml.inference import predict
from api.supabase_client import supabase
from api.services.storage_service import upload_image

def predict_image(image_path: str, filename: str):
    logger.info(f"Starting prediction for {filename}")
    try:
        # Predict disease
        result = predict(image_path)
        logger.info("Prediction completed successfully.")
        
        # Upload image to Supabase Storage
        logger.info("Uploading image to Supabase Storage.")
        image_url = upload_image(image_path, filename)
        
        # Save prediction details
        logger.info("Saving prediction to database.")
        supabase.table("predictions").insert({
            "filename": filename,
            "image_url": image_url,
            "prediction": result["prediction"],
            "code": result["code"],
            "confidence": result["confidence"]
        }).execute()

        # Return response
        return {
            **result,
            "image_url": image_url
        }
    except Exception as e:
        logger.exception(f"Prediction failed for {filename}: {e}")
        raise e
    finally:
        # Delete temporary file unless we are in mock mode (so we can serve it locally)
        if os.path.exists(image_path) and not getattr(supabase, "is_mock", False):
            os.remove(image_path)
            logger.info("Temporary file deleted.")