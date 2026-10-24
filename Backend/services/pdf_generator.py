# BoxGuard - Professional Packing Challan Generator
# Updated format with professional packing slip layout

import os
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle

CHALLANS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "challans")
os.makedirs(CHALLANS_DIR, exist_ok=True)

W, H = A4
M = 2 * cm  # Margins

# Colors matching BoxGuard brand
BRAND_GREEN = colors.HexColor("#1D9E75")
DARK_HEADER = colors.HexColor("#0f172a")
WHITE = colors.white
LIGHT_GRAY = colors.HexColor("#f8fafc")
BORDER_GRAY = colors.HexColor("#cbd5e1")
TEXT_DARK = colors.HexColor("#1e293b")
TEXT_MUTED = colors.HexColor("#64748b")


def _fmt_date(iso_str):
    """Format ISO date string to readable format"""
    try:
        if not iso_str:
            return "—"
        dt = datetime.fromisoformat(str(iso_str))
        return dt.strftime("%d %b %Y")
    except Exception:
        return "—"


def generate_challan(session, logs, user_data=None):
    """Generate a professional packing challan PDF"""
    session_id = str(session.get("_id", "unknown"))
    batch_id = session.get("batch_id", "—")
    operator_id = session.get("operator_id", "—")
    started_at = session.get("started_at")
    ended_at = session.get("ended_at")
    final_count = session.get("final_count", 0)
    
    # Extract user challan information
    ms_name = user_data.get("ms_name", "—") if user_data else "—"
    transporter_id = user_data.get("transporter_id", "—") if user_data else "—"
    courier_partner = user_data.get("courier_partner", "—") if user_data else "—"
    
    output_path = os.path.abspath(
        os.path.join(CHALLANS_DIR, f"challan_{session_id}.pdf")
    )
    
    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle(f"BoxGuard Challan - {batch_id}")
    c.setAuthor("BoxGuard Systems")
    
    y = H - M
    
    # ═══════════════════════════════════════════════════════════
    # SECTION 1: TOP HEADER
    # ═══════════════════════════════════════════════════════════
    c.setFillColor(BRAND_GREEN)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(W / 2, y, "BoxGuard Systems")
    
    y -= 0.6 * cm
    c.setFillColor(TEXT_DARK)
    c.setFont("Helvetica", 14)
    c.drawCentredString(W / 2, y, "Packing Challan")
    
    y -= 0.8 * cm
    c.setStrokeColor(BORDER_GRAY)
    c.setLineWidth(1)
    c.line(M, y, W - M, y)
    
    y -= 1.2 * cm
    
    # ═══════════════════════════════════════════════════════════
    # SECTION 2: TWO COLUMN INFO TABLE
    # ═══════════════════════════════════════════════════════════
    
    # Calculate table dimensions
    table_width = W - 2 * M
    col_width = table_width / 2
    row_height = 0.7 * cm
    
    # Left column data
    left_data = [
        ["Customer Detail", ""],
        ["M/S", ms_name],
        ["Transporter ID", transporter_id],
        ["Courier Partner", courier_partner],
    ]
    
    # Right column data - last 9 digits of session_id
    challan_no = session_id[-9:] if len(session_id) >= 9 else session_id
    pickup_date = _fmt_date(ended_at)
    lot_no = batch_id
    no_of_boxes = str(final_count)
    
    right_data = [
        ["Challan No.", challan_no],
        ["Pickup Date", pickup_date],
        ["Lot No.", lot_no],
        ["No. of Boxes", no_of_boxes],
    ]
    
    # Draw left table
    left_table = Table(left_data, colWidths=[col_width * 0.4, col_width * 0.6], rowHeights=row_height)
    left_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), DARK_HEADER),
        ('TEXTCOLOR', (0, 0), (1, 0), WHITE),
        ('FONT', (0, 0), (1, 0), 'Helvetica-Bold', 10),
        ('FONT', (0, 1), (1, -1), 'Helvetica', 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
    ]))
    
    # Draw right table
    right_table = Table(right_data, colWidths=[col_width * 0.4, col_width * 0.6], rowHeights=row_height)
    right_table.setStyle(TableStyle([
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 9),
        ('FONT', (1, 0), (1, -1), 'Helvetica', 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [WHITE, LIGHT_GRAY]),
    ]))
    
    # Position and draw tables side by side
    left_table.wrapOn(c, col_width, H)
    left_table.drawOn(c, M, y - len(left_data) * row_height)
    
    right_table.wrapOn(c, col_width, H)
    right_table.drawOn(c, M + col_width, y - len(right_data) * row_height)
    
    y -= (len(left_data) * row_height + 1.5 * cm)
    
    # ═══════════════════════════════════════════════════════════
    # SECTION 3: PRODUCT TABLE
    # ═══════════════════════════════════════════════════════════
    
    product_data = [
        ["Sr. No.", "Name of Product", "Qty"],
        ["1.", f"{batch_id} — Packed Items", str(final_count)],
        ["Total", "", str(final_count)],
    ]
    
    product_table = Table(product_data, colWidths=[2*cm, table_width - 5*cm, 3*cm], rowHeights=row_height)
    product_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (2, 0), DARK_HEADER),
        ('TEXTCOLOR', (0, 0), (2, 0), WHITE),
        ('FONT', (0, 0), (2, 0), 'Helvetica-Bold', 10),
        ('ALIGN', (0, 0), (2, 0), 'CENTER'),
        
        # Data row
        ('FONT', (0, 1), (2, 1), 'Helvetica', 9),
        ('ALIGN', (0, 1), (0, 1), 'CENTER'),
        ('ALIGN', (1, 1), (1, 1), 'LEFT'),
        ('ALIGN', (2, 1), (2, 1), 'CENTER'),
        
        # Total row
        ('SPAN', (0, 2), (1, 2)),  # Merge first two cells
        ('FONT', (0, 2), (2, 2), 'Helvetica-Bold', 10),
        ('ALIGN', (0, 2), (0, 2), 'CENTER'),
        ('ALIGN', (2, 2), (2, 2), 'CENTER'),
        ('BACKGROUND', (0, 2), (2, 2), LIGHT_GRAY),
        
        # All cells
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, 1), [WHITE]),
    ]))
    
    product_table.wrapOn(c, table_width, H)
    product_table.drawOn(c, M, y - len(product_data) * row_height)
    
    y -= (len(product_data) * row_height + 1.5 * cm)
    
    # ═══════════════════════════════════════════════════════════
    # SECTION 4: FOOTER
    # ═══════════════════════════════════════════════════════════
    
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(M, y, "Generated by BoxGuard AI System")
    
    c.setFont("Helvetica", 8)
    timestamp = datetime.now().strftime("%d %b %Y, %H:%M")
    c.drawRightString(W - M, y, timestamp)
    
    y -= 0.5 * cm
    c.setFont("Helvetica", 8)
    c.drawCentredString(W / 2, y, "Verified by AI counting system — accuracy target 95%+")
    
    y -= 0.5 * cm
    c.setStrokeColor(BORDER_GRAY)
    c.setLineWidth(1)
    c.line(M, y, W - M, y)
    
    c.save()
    return output_path
