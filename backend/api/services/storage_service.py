from api.config import BUCKET_NAME
from api.supabase_client import supabase

def upload_image(local_path:str,filename:str)->str:
    with open(local_path,"rb") as image_file:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=image_file,
            file_options={
                "content-type":"image/jpeg",
                "upsert":False
            }
        )

    public_url=(
        supabase.storage
        .from_(BUCKET_NAME)
        .get_public_url(filename)
    )

    return public_url

def delete_image(filename:str):
    supabase.storage.from_(BUCKET_NAME).remove([filename])