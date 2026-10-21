import io
import os
import uuid
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as ReportImage,
)

from PIL import Image as PILImage

from api.logger import logger
from api.supabase_client import supabase


BUCKET_NAME = "medical-reports"
MODEL_VERSION = "DERMO-AI-3-stage"


def safe_text(value) -> str:
    """Escape dynamic text before inserting it into ReportLab paragraphs."""
    return escape(str(value if value is not None else "Not available"))

def confidence_as_percentage(value: float) -> float:
    """Accept either a fraction (0.9986) or percentage (99.86)."""
    value = float(value)

    if 0.0 <= value <= 1.0:
        return value * 100.0

    if 1.0 < value <= 100.0:
        return value

    raise ValueError("Confidence must be between 0 and 100.")

def generate_and_store_report(
        prediction_id: int,
        filename: str,
        image_path: str,
        image_url: str,
        prediction: str,
        code: str,
        confidence: float,
        normal_skin_probability: float | None = None,
        lesion_skin_probability: float | None = None,
        warnings: list[str] | None = None,
        user_id: str | None = None,
) -> dict:
    """
    Generate a PDF, upload it to private Supabase Storage,
    and insert the report metadata into public.reports.

    The caller must supply the ID of the existing prediction record.
    """

    report_uuid = uuid.uuid4()
    report_number = f"DERMO-RPT-{report_uuid.hex[:12].upper()}"
    created_at = datetime.now(timezone.utc)

    pdf_buffer = io.BytesIO()

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Title"],
            alignment=TA_CENTER,
            textColor=colors.HexColor("#17365D"),
            fontSize=19,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            textColor=colors.HexColor("#17365D"),
            spaceBefore=12,
            spaceAfter=6,
        )
    )

    document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"DERMO-AI Report {report_number}",
        author="DERMO-AI",
    )

    story = [
        Paragraph("DERMO-AI", styles["ReportTitle"]),
        Paragraph("AI-Assisted Skin Image Assessment Report", styles["Heading2"]),
        Spacer(1, 5 * mm),
        Paragraph("Report Information", styles["SectionHeading"]),
    ]

    report_rows = [
        ["Report Number", report_number],
        ["Generated At (UTC)", created_at.strftime("%Y-%m-%d %H:%M:%S")],
        ["Prediction Record ID", str(prediction_id)],
        ["Uploaded Filename", filename],
        ["Model Pipeline", MODEL_VERSION],
    ]

    report_table = Table(report_rows, colWidths=[48 * mm, 105 * mm])
    report_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF0F8")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )

    story.extend([
        report_table,
        Paragraph("AI Prediction Results", styles["SectionHeading"]),
    ])

    result_rows = [
        ["Predicted Class", prediction],
        ["Class Code", code],
        [
            "Model Confidence",
            f"{confidence_as_percentage(confidence):.2f}%"
        ],
    ]

    if normal_skin_probability is not None:
        result_rows.append([
            "Normal Skin Probability",
            f"{normal_skin_probability * 100:.2f}%",
        ])

    if lesion_skin_probability is not None:
        result_rows.append([
            "Lesion Skin Probability",
            f"{lesion_skin_probability * 100:.2f}%",
        ])

    result_table = Table(
        [[safe_text(label), safe_text(value)] for label, value in result_rows],
        colWidths=[65 * mm, 88 * mm],
    )
    result_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF0F8")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(result_table)

    # Include the uploaded scan when it can be opened safely.
    try:
        source_image = None
        if image_path and os.path.exists(image_path):
            with PILImage.open(image_path) as img:
                img.verify()
            source_image = PILImage.open(image_path)
        elif image_url and (image_url.startswith("http://") or image_url.startswith("https://")):
            import urllib.request
            req = urllib.request.Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = resp.read()
                source_image = PILImage.open(io.BytesIO(data))

        if source_image:
            source_image = source_image.convert("RGB")
            source_image.thumbnail((900, 700))

            image_buffer = io.BytesIO()
            source_image.save(image_buffer, format="JPEG", quality=85)
            image_buffer.seek(0)

            story.extend([
                Paragraph("Scan Image", styles["SectionHeading"]),
                ReportImage(
                    image_buffer,
                    width=110 * mm,
                    height=80 * mm,
                    kind="proportional",
                ),
            ])
    except Exception as e:
        logger.warning(f"Could not embed scan image in report PDF: {e}")

    story.append(Paragraph("Image Quality Warnings", styles["SectionHeading"]))

    if warnings:
        for warning in warnings:
            story.append(Paragraph(f"- {safe_text(warning)}", styles["BodyText"]))
    else:
        story.append(Paragraph("No image quality warnings were recorded.", styles["BodyText"]))

    story.extend([
        Spacer(1, 8 * mm),
        Paragraph("Important Medical Disclaimer", styles["SectionHeading"]),
        Paragraph(
            "This document contains an AI-generated image classification result "
            "for informational and research purposes. It is not a confirmed "
            "medical diagnosis and must not be used as the sole basis for "
            "treatment or medical decisions. Model confidence is not the same "
            "as the probability that a person has the predicted disease. "
            "Consult a qualified healthcare professional for clinical assessment.",
            styles["BodyText"],
        ),
        Spacer(1, 5 * mm),
        Paragraph(
            f"Generated by DERMO-AI. Report ID: {report_number}",
            styles["Italic"],
        ),
    ])

    document.build(story)
    pdf_bytes = pdf_buffer.getvalue()
    pdf_buffer.close()

    storage_path = f"reports/{report_number}.pdf"
    uploaded = False

    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=pdf_bytes,
            file_options={
                "content-type": "application/pdf",
                "upsert": "false",
            },
        )
        uploaded = True

        report_record = {
            "report_number": report_number,
            "prediction_id": prediction_id,
            "pdf_storage_path": storage_path,
            "model_version": MODEL_VERSION,
            "created_at": created_at.isoformat(),
        }

        if user_id:
            report_record["user_id"] = user_id

        response = (
            supabase.table("reports")
            .insert(report_record)
            .execute()
        )

        if not response.data:
            raise RuntimeError("Supabase did not confirm report metadata insertion.")

        logger.info("Report generated and saved: %s", report_number)

        return {
            "report_id": response.data[0]["id"],
            "report_number": report_number,
            "pdf_storage_path": storage_path,
        }

    except Exception:
        logger.exception("Failed to persist report %s", report_number)

        # Avoid leaving an unreferenced PDF when metadata insertion fails.
        if uploaded:
            try:
                supabase.storage.from_(BUCKET_NAME).remove([storage_path])
            except Exception:
                logger.exception("Could not clean up orphaned report PDF.")

        raise