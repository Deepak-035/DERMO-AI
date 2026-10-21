from typing import Optional, Tuple
from api.config import BUCKET_NAME
from api.supabase_client import supabase
from api.logger import logger


def upload_private_image(local_path: str, filename: str, user_id: str) -> Tuple[str, str]:
    """
    Upload patient skin image to user-scoped private storage path: {user_id}/{filename}.
    Returns a tuple of (internal_storage_path, temporary_signed_url).
    """
    storage_path = f"{user_id}/{filename}"

    with open(local_path, "rb") as image_file:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=image_file,
            file_options={
                "content-type": "image/jpeg",
                "upsert": "false",
            },
        )

    # Generate short-lived signed URL (valid for 1 hour)
    signed_url = get_signed_image_url(storage_path, expires_in=3600)
    return storage_path, signed_url


def get_signed_image_url(storage_path: str, expires_in: int = 3600) -> str:
    """
    Generate short-lived signed URL for private image access.
    Falls back gracefully if storage is local or returns error.
    """
    try:
        res = supabase.storage.from_(BUCKET_NAME).create_signed_url(storage_path, expires_in)
        if isinstance(res, dict):
            return res.get("signedURL") or res.get("signedUrl") or res.get("url") or ""
        return str(res)
    except Exception as e:
        logger.warning(f"Could not generate signed URL for {storage_path}: {e}")
        # If signed URL fails or legacy bucket, try public URL as fallback
        try:
            return supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
        except Exception:
            return ""


def upload_image(local_path: str, filename: str, user_id: Optional[str] = None) -> str:
    """
    Backward-compatible upload function.
    If user_id is provided, stores under private user path; otherwise root path.
    """
    if user_id:
        storage_path, signed_url = upload_private_image(local_path, filename, user_id)
        return signed_url or storage_path

    with open(local_path, "rb") as image_file:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=image_file,
            file_options={
                "content-type": "image/jpeg",
                "upsert": "false",
            },
        )

    return get_signed_image_url(filename, expires_in=3600)


def download_image_bytes(storage_path: str) -> bytes:
    """
    Download image bytes from private storage for authorized streaming or verification.
    """
    data = supabase.storage.from_(BUCKET_NAME).download(storage_path)
    return bytes(data) if not isinstance(data, bytes) else data


def delete_image(storage_path: str):
    """
    Remove image from storage. Accepts either storage_path ('user/img.jpg') or filename ('img.jpg').
    """
    try:
        supabase.storage.from_(BUCKET_NAME).remove([storage_path])
    except Exception as e:
        logger.warning(f"Error removing image {storage_path} from storage: {e}")