import io
import os
import uuid
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
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
from reportlab.graphics.shapes import Drawing, Circle, Line
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


def create_dermo_logo(size: float = 36) -> Drawing:
    """
    Renders the official DERMO-AI clinical reticle logo as a crisp vector drawing.
    Placed in the top-left corner of the document header.
    """
    d = Drawing(size, size)
    cx, cy = size / 2.0, size / 2.0

    # Background subtle disc
    d.add(
        Circle(
            cx,
            cy,
            size / 2.0 - 1,
            fillColor=colors.HexColor("#F8FAFC"),
            strokeColor=colors.HexColor("#CBD5E1"),
            strokeWidth=1,
        )
    )
    # Outer dermatoscope frame ring
    d.add(
        Circle(
            cx,
            cy,
            size / 2.0 - 5,
            fillColor=None,
            strokeColor=colors.HexColor("#0F172A"),
            strokeWidth=2,
        )
    )
    # Inner alignment reticle
    d.add(
        Circle(
            cx,
            cy,
            size / 3.8,
            fillColor=None,
            strokeColor=colors.HexColor("#94A3B8"),
            strokeWidth=0.8,
        )
    )
    # Target lesion focal indicator (indigo dot in upper-right quadrant)
    d.add(
        Circle(
            cx + size / 5.2,
            cy + size / 5.5,
            size / 10.5,
            fillColor=colors.HexColor("#4F46E5"),
            strokeColor=colors.HexColor("#3730A3"),
            strokeWidth=0.5,
        )
    )
    return d


def draw_page_footer(canvas, doc, report_number: str):
    """Running footer drawn on all pages with legal confidentiality notices."""
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, 14 * mm, 190 * mm, 14 * mm)

    canvas.setFont("Helvetica-Bold", 7)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(
        20 * mm,
        10 * mm,
        "STRICTLY CONFIDENTIAL · PROTECTED HEALTH INFORMATION (PHI) · CLINICAL EYE ONLY",
    )

    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(
        190 * mm,
        10 * mm,
        f"DERMO-AI Verification Engine · {report_number}",
    )
    canvas.restoreState()


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
    patient_name: str | None = None,
) -> dict:
    """
    Generate an authoritative clinical PDF report, upload it to private Supabase Storage,
    and insert report metadata into public.reports.
    """
    report_uuid = uuid.uuid4()
    report_number = f"DERMO-RPT-{report_uuid.hex[:12].upper()}"
    created_at = datetime.now(timezone.utc)

    # 1. Resolve Patient Name
    resolved_patient_name = patient_name
    if not resolved_patient_name and user_id:
        try:
            profile_resp = (
                supabase.table("profiles")
                .select("full_name, email")
                .eq("id", str(user_id))
                .execute()
            )
            if profile_resp.data and len(profile_resp.data) > 0:
                p_data = profile_resp.data[0]
                resolved_patient_name = p_data.get("full_name") or p_data.get("email")
        except Exception as e:
            logger.warning("Could not query patient profile by user_id %s: %s", user_id, e)

    # Fallback to query prediction's owner if user_id wasn't provided directly
    if not resolved_patient_name and prediction_id:
        try:
            pred_resp = (
                supabase.table("predictions")
                .select("user_id")
                .eq("id", prediction_id)
                .execute()
            )
            if pred_resp.data and pred_resp.data[0].get("user_id"):
                p_uid = pred_resp.data[0]["user_id"]
                profile_resp = (
                    supabase.table("profiles")
                    .select("full_name, email")
                    .eq("id", str(p_uid))
                    .execute()
                )
                if profile_resp.data and len(profile_resp.data) > 0:
                    p_data = profile_resp.data[0]
                    resolved_patient_name = p_data.get("full_name") or p_data.get("email")
        except Exception as e:
            logger.warning("Could not query patient profile from prediction %s: %s", prediction_id, e)

    if not resolved_patient_name:
        resolved_patient_name = "Anonymous / Unspecified Patient"

    pdf_buffer = io.BytesIO()

    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="HeaderBrand",
            parent=styles["Normal"],
            leading=13,
            spaceAfter=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="HeaderMeta",
            parent=styles["Normal"],
            alignment=TA_RIGHT,
            leading=11,
            spaceAfter=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            textColor=colors.HexColor("#0F172A"),
            fontSize=11,
            spaceBefore=10,
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCellKey",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            textColor=colors.HexColor("#334155"),
            leading=11,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCellValue",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=colors.HexColor("#0F172A"),
            leading=11,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DisclaimerBox",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=colors.HexColor("#475569"),
            leading=10.5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ReviewHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            textColor=colors.HexColor("#0F172A"),
            leading=11,
        )
    )

    document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=16 * mm,
        bottomMargin=20 * mm,
        title=f"DERMO-AI Report {report_number}",
        author="DERMO-AI",
    )

    story = []

    # ---------------------------------------------------------
    # HEADER: Top-Left Logo + Brand Title + Right Meta
    # ---------------------------------------------------------
    logo_flowable = create_dermo_logo(size=36)

    header_table_data = [
        [
            logo_flowable,
            Paragraph(
                "<font size=16 color='#0F172A'><b>DERMO<font color='#4F46E5'>·AI</font></b></font><br/>"
                "<font size=8 color='#475569'>CLINICAL DERMATOLOGY SCREENING &amp; DECISION SUPPORT</font>",
                styles["HeaderBrand"],
            ),
            Paragraph(
                f"<font size=8 color='#64748B'>DOCUMENT ID: <b>{safe_text(report_number)}</b></font><br/>"
                f"<font size=8 color='#64748B'>DATE ISSUED: {created_at.strftime('%Y-%m-%d %H:%M UTC')}</font><br/>"
                f"<font size=8 color='#DC2626'><b>CONFIDENTIAL MEDICAL RECORD</b></font>",
                styles["HeaderMeta"],
            ),
        ]
    ]

    header_table = Table(header_table_data, colWidths=[15 * mm, 85 * mm, 70 * mm])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -1), 1.2, colors.HexColor("#0F172A")),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 4 * mm))

    # ---------------------------------------------------------
    # SECTION 1: Patient & Report Information
    # ---------------------------------------------------------
    story.append(Paragraph("Patient &amp; Intake Details", styles["SectionHeading"]))

    report_rows = [
        [
            Paragraph("Patient Name", styles["TableCellKey"]),
            Paragraph(f"<b>{safe_text(resolved_patient_name)}</b>", styles["TableCellValue"]),
        ],
        [
            Paragraph("Report Number", styles["TableCellKey"]),
            Paragraph(safe_text(report_number), styles["TableCellValue"]),
        ],
        [
            Paragraph("Generated At (UTC)", styles["TableCellKey"]),
            Paragraph(created_at.strftime("%Y-%m-%d %H:%M:%S"), styles["TableCellValue"]),
        ],
        [
            Paragraph("Prediction Record ID", styles["TableCellKey"]),
            Paragraph(f"#{prediction_id}", styles["TableCellValue"]),
        ],
        [
            Paragraph("Uploaded Filename", styles["TableCellKey"]),
            Paragraph(safe_text(filename), styles["TableCellValue"]),
        ],
        [
            Paragraph("Model Architecture", styles["TableCellKey"]),
            Paragraph(safe_text(MODEL_VERSION), styles["TableCellValue"]),
        ],
    ]

    report_table = Table(report_rows, colWidths=[55 * mm, 115 * mm])
    report_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(report_table)

    # ---------------------------------------------------------
    # SECTION 2: AI Prediction & Differential Telemetry
    # ---------------------------------------------------------
    story.append(Paragraph("AI Differential Screening Results", styles["SectionHeading"]))

    result_rows = [
        [
            Paragraph("Predicted Class", styles["TableCellKey"]),
            Paragraph(f"<b>{safe_text(prediction)}</b>", styles["TableCellValue"]),
        ],
        [
            Paragraph("Class Code", styles["TableCellKey"]),
            Paragraph(f"<b>{safe_text(code).upper()}</b>", styles["TableCellValue"]),
        ],
        [
            Paragraph("Model Confidence", styles["TableCellKey"]),
            Paragraph(f"<b>{confidence_as_percentage(confidence):.2f}%</b>", styles["TableCellValue"]),
        ],
    ]

    if normal_skin_probability is not None:
        result_rows.append([
            Paragraph("Normal Skin Probability", styles["TableCellKey"]),
            Paragraph(f"{normal_skin_probability * 100:.2f}%", styles["TableCellValue"]),
        ])

    if lesion_skin_probability is not None:
        result_rows.append([
            Paragraph("Lesion Skin Probability", styles["TableCellKey"]),
            Paragraph(f"{lesion_skin_probability * 100:.2f}%", styles["TableCellValue"]),
        ])

    result_table = Table(result_rows, colWidths=[55 * mm, 115 * mm])
    result_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(result_table)

    # ---------------------------------------------------------
    # SECTION 3: Scan Image
    # ---------------------------------------------------------
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
            source_image.thumbnail((800, 600))

            image_buffer = io.BytesIO()
            source_image.save(image_buffer, format="JPEG", quality=85)
            image_buffer.seek(0)

            story.append(Paragraph("Evaluated Specimen Photograph", styles["SectionHeading"]))
            story.append(
                ReportImage(
                    image_buffer,
                    width=90 * mm,
                    height=65 * mm,
                    kind="proportional",
                )
            )
    except Exception as e:
        logger.warning(f"Could not embed scan image in report PDF: {e}")

    # ---------------------------------------------------------
    # SECTION 4: Image Quality Warnings
    # ---------------------------------------------------------
    story.append(Paragraph("Image Quality Warnings", styles["SectionHeading"]))
    if warnings:
        for warning in warnings:
            story.append(Paragraph(f"• {safe_text(warning)}", styles["BodyText"]))
    else:
        story.append(Paragraph("No optical quality or border ambiguity warnings recorded.", styles["BodyText"]))

    story.append(Spacer(1, 4 * mm))

    # ---------------------------------------------------------
    # SECTION 5: Attending Clinician Review & Attestation Box
    # ---------------------------------------------------------
    review_rows = [
        [
            Paragraph("<b>Attending Clinician / Reviewing Dermatologist:</b>", styles["ReviewHeading"]),
            Paragraph("<b>Date of Evaluation:</b> _______________", styles["ReviewHeading"]),
        ],
        [
            Paragraph(
                "Clinical Assessment &amp; Triage Action:<br/>"
                "[  ] Concur with screening &nbsp;&nbsp;&nbsp;&nbsp; "
                "[  ] Dermatoscopy scheduled &nbsp;&nbsp;&nbsp;&nbsp; "
                "[  ] Histological biopsy ordered",
                styles["TableCellValue"],
            ),
            Paragraph(
                "Physician Signature:<br/><br/>________________________________________",
                styles["TableCellValue"],
            ),
        ],
    ]

    review_table = Table(review_rows, colWidths=[105 * mm, 65 * mm])
    review_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#0F172A")),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(review_table)
    story.append(Spacer(1, 3 * mm))

    # ---------------------------------------------------------
    # SECTION 6: Mandatory Medical & Regulatory Disclaimer
    # ---------------------------------------------------------
    disclaimer_text = (
        "<b>MANDATORY MEDICAL &amp; REGULATORY NOTICE:</b> This document contains an automated "
        "decision-support screening summary produced by the DERMO-AI convolutional-transformer model. "
        "It is <b>NOT</b> a definitive medical diagnosis and does not establish a physician-patient relationship. "
        "Model probability represents statistical classification likeness against dermoscopic training benchmarks, "
        "not confirmed histological malignancy. Any change in lesion size, color, or border requires comprehensive "
        "clinical evaluation by a licensed healthcare professional."
    )

    disclaimer_table = Table([[Paragraph(disclaimer_text, styles["DisclaimerBox"])]], colWidths=[170 * mm])
    disclaimer_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFBEB")),
            ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#F59E0B")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(disclaimer_table)

    # Build the document with running page footer callback
    document.build(
        story,
        onFirstPage=lambda canvas, doc: draw_page_footer(canvas, doc, report_number),
        onLaterPages=lambda canvas, doc: draw_page_footer(canvas, doc, report_number),
    )

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

        logger.info("Report generated and saved: %s for patient: %s", report_number, resolved_patient_name)

        return {
            "report_id": response.data[0]["id"],
            "report_number": report_number,
            "pdf_storage_path": storage_path,
        }

    except Exception:
        logger.exception("Failed to persist report %s", report_number)

        if uploaded:
            try:
                supabase.storage.from_(BUCKET_NAME).remove([storage_path])
            except Exception:
                logger.exception("Could not clean up orphaned report PDF.")

        raise