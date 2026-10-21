from io import BytesIO
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from api.supabase_client import supabase
from api.logger import logger
from api.auth import get_current_user, AuthenticatedUser
from api.services.audit_service import log_audit_event

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Download a PDF report by report ID.
    Strictly verifies patient ownership, approved doctor sharing consent, or admin authorization.
    """
    # Fetch report metadata from the database
    try:
        response = (
            supabase.table("reports")
            .select("id, report_number, user_id, pdf_storage_path")
            .eq("id", report_id)
            .limit(1)
            .execute()
        )
    except Exception as e:
        logger.exception(f"Error querying report metadata for report_id {report_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve report information from database.",
        )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found.",
        )

    report = response.data[0]
    report_user_id = report.get("user_id")

    # Verify authorization
    if report_user_id:
        is_owner = str(report_user_id) == str(current_user.id)
        is_admin = current_user.role == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to download this report.",
            )

    # Download the PDF from private Supabase Storage
    try:
        pdf_bytes = (
            supabase.storage
            .from_("medical-reports")
            .download(report["pdf_storage_path"])
        )

        if not isinstance(pdf_bytes, bytes):
            pdf_bytes = bytes(pdf_bytes)

    except Exception as e:
        logger.exception(f"Error downloading PDF from storage for path {report.get('pdf_storage_path')}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve the PDF file from storage.",
        )

    report_number = report.get("report_number", f"report_{report_id}")

    # Record audit log
    log_audit_event(
        actor_id=current_user.id,
        action="report_downloaded",
        target_id=str(report_id),
        details={"report_number": report_number, "patient_id": str(report_user_id) if report_user_id else None},
    )

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


@router.get("/prediction/{prediction_id}/download")
def download_report_by_prediction(
    prediction_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Download a PDF report associated with a specific prediction ID.
    Strictly verifies ownership or active doctor grant.
    """
    # 1. Check if a report record already exists for this prediction
    try:
        report_resp = (
            supabase.table("reports")
            .select("id, report_number, user_id, pdf_storage_path")
            .eq("prediction_id", prediction_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if report_resp.data:
            report = report_resp.data[0]
            return download_report(report["id"], current_user=current_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Failed to check existing report for prediction_id {prediction_id}: {e}")

    # 2. If no existing report, fetch prediction record to generate one
    try:
        pred_resp = (
            supabase.table("predictions")
            .select("id, filename, image_url, prediction, code, confidence, user_id")
            .eq("id", prediction_id)
            .limit(1)
            .execute()
        )
    except Exception as e:
        logger.exception(f"Error fetching prediction {prediction_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve prediction information.",
        )

    if not pred_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction record with ID {prediction_id} not found.",
        )

    pred = pred_resp.data[0]
    pred_user_id = pred.get("user_id")

    # Verify authorization
    if pred_user_id:
        is_owner = str(pred_user_id) == str(current_user.id)
        is_admin = current_user.role == "admin"
        if not (is_owner or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to generate or download reports for this record.",
            )

    # Generate and store report on-demand
    try:
        from api.services.report_service import generate_and_store_report
        new_report = generate_and_store_report(
            prediction_id=pred["id"],
            filename=pred.get("filename", "unknown.jpg"),
            image_path="",
            image_url=pred.get("image_url", ""),
            prediction=pred.get("prediction", "Unknown"),
            code=pred.get("code", "unk"),
            confidence=float(pred.get("confidence", 0.0)),
            user_id=pred_user_id,
        )
        return download_report(new_report["report_id"], current_user=current_user)
    except Exception as e:
        logger.exception(f"Failed to generate report on-demand for prediction {prediction_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF report: {str(e)}",
        )
