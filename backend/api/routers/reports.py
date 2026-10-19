from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from api.supabase_client import supabase

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


# Replace this with your actual Supabase authentication dependency.
def get_current_user():
    raise HTTPException(
        status_code=501,
        detail="Authentication dependency is not configured yet.",
    )


@router.get("/{report_id}/download")
def download_report(
        report_id: int,
        current_user=Depends(get_current_user),
):
    """
    Download a PDF report after verifying report ownership.
    """

    # Fetch report metadata from the database.
    try:
        response = (
            supabase.table("reports")
            .select(
                "id, report_number, user_id, pdf_storage_path"
            )
            .eq("id", report_id)
            .limit(1)
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve report information.",
        )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Report not found.",
        )

    report = response.data[0]

    # Verify the authenticated user's ownership.
    current_user_id = str(current_user.id)
    report_user_id = report.get("user_id")

    if (
            not report_user_id
            or str(report_user_id) != current_user_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to download this report.",
        )

    # Download the PDF from private Supabase Storage.
    try:
        pdf_bytes = (
            supabase.storage
            .from_("medical-reports")
            .download(report["pdf_storage_path"])
        )

        if not isinstance(pdf_bytes, bytes):
            pdf_bytes = bytes(pdf_bytes)

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve the PDF file.",
        )

    report_number = report["report_number"]

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{report_number}.pdf"'
            ),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
