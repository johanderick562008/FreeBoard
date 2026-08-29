"""
Timetable image -> grid extraction, v3 (structure-first).

Order of operations, matching how a person actually reads a timetable photo:
  1. Detect the table's real grid lines -> real cell boxes (not word positions).
  2. Find which cells are "Break" columns from the header row's own text, and
     exclude them entirely -> they never become a slot and never shift
     anything else.
  3. Find which row is which day by matching the leftmost cell's text against
     Monday..Friday -> never assumed by row order.
  4. Build the 8 real period columns from the *remaining* (non-break, non-day-
     label) header cells, left to right -> "Period" numbers are derived from
     actual header content and order, not raw x position.
  5. For each day row, overlap each detected cell against the 8 period
     column ranges. A cell that spans two period ranges (a merged class,
     e.g. a 2-period lab) is assigned to *both* periods automatically,
     because both overlaps trigger — no separate merge-detection pass needed.
  6. A period with no overlapping cell is checked for actual ink in that
     region of the photo: genuinely blank -> "Free" (this is a real timetable
     entry, not a guess). Some ink but nothing OCR could read -> left blank
     and flagged for manual review, never invented as "Class".

If the photo doesn't have clear structure (skewed, no visible lines, too
few day rows found), everything falls back to a best-effort word-position
heuristic so the user still gets *something* to correct, rather than a
hard failure.
"""

import re
import platform
from io import BytesIO
from typing import List, Optional, Tuple, Dict

import cv2
import numpy as np
import pytesseract
from pytesseract import Output
from PIL import Image, ImageOps

from ..schemas import OcrReviewCell

# Windows Tesseract path (kept from the working local setup) — only applies on
# Windows. On Linux (Render, or any other Linux host) pytesseract instead finds
# the "tesseract" binary via the system PATH, which is where apt installs it.
if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = (r"C:\Program Files\Tesseract-OCR\tesseract.exe")

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
DAY_HINTS = {"mon": "Monday", "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday", "fri": "Friday"}
MAX_SLOTS = 8
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
TIME_PATTERN = re.compile(r"\d{1,2}[:.]\d{2}")
BLANK_INK_RATIO = 0.015   # below this fraction of dark pixels, a cell counts as genuinely empty
OVERLAP_THRESHOLD = 0.4   # a cell must cover at least this much of a period's width to count


def _normalize(label: str, confidence: float) -> Tuple[str, float]:
    """FreeBoard tracks availability, not lecture titles — Lunch counts the same as an
    empty cell: the student is free. Everything else is left exactly as recognized."""
    if label.strip().lower() == "lunch":
        return "Free", max(confidence, 0.9)
    return label, confidence


# ---------------------------------------------------------------- image prep

def _load_gray(raw_bytes: bytes) -> np.ndarray:
    image = Image.open(BytesIO(raw_bytes))
    image = ImageOps.exif_transpose(image)   # respect camera rotation
    image.info.pop("exif", None)             # strip metadata before further processing
    return np.array(ImageOps.grayscale(image))


def _ink_mask(gray: np.ndarray) -> np.ndarray:
    return cv2.adaptiveThreshold(255 - gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, -2)


def _detect_cell_boxes(ink: np.ndarray) -> List[Tuple[int, int, int, int]]:
    h, w = ink.shape
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(w // 25, 20), 1))
    horiz = cv2.dilate(cv2.erode(ink, horiz_kernel), horiz_kernel)

    vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(h // 25, 20)))
    vert = cv2.dilate(cv2.erode(ink, vert_kernel), vert_kernel)

    grid = cv2.dilate(cv2.bitwise_or(horiz, vert), cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))
    cell_mask = cv2.bitwise_not(grid)
    contours, _ = cv2.findContours(cell_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes = []
    min_area = (w * h) * 0.0015
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        if cw * ch < min_area or cw < 20 or ch < 12:
            continue
        boxes.append((x, y, cw, ch))
    return boxes


def _cluster_rows(boxes: List[Tuple[int, int, int, int]]) -> List[List[Tuple[int, int, int, int]]]:
    """Groups boxes into rows by y-center, each row internally sorted left to right."""
    if not boxes:
        return []
    centers = [b[1] + b[3] / 2 for b in boxes]
    order = sorted(range(len(boxes)), key=lambda i: centers[i])
    avg_h = sum(b[3] for b in boxes) / len(boxes)
    threshold = avg_h * 0.6

    groups = [[order[0]]]
    for i in range(1, len(order)):
        if centers[order[i]] - centers[order[i - 1]] > threshold:
            groups.append([])
        groups[-1].append(order[i])

    rows = [[boxes[i] for i in g] for g in groups]
    for row in rows:
        row.sort(key=lambda b: b[0])
    return rows


def _ocr_cell(gray: np.ndarray, box: Tuple[int, int, int, int]) -> Tuple[str, float]:
    x, y, w, h = box
    pad = 3
    crop = gray[max(0, y + pad):y + h - pad, max(0, x + pad):x + w - pad]
    if crop.size == 0:
        return "", 0.0
    crop = cv2.resize(crop, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    data = pytesseract.image_to_data(crop, output_type=Output.DICT, config="--psm 6")
    words, confs = [], []
    for i in range(len(data["text"])):
        t = data["text"][i].strip()
        c = float(data["conf"][i]) if data["conf"][i] != "-1" else -1
        if t and c > 20:
            words.append(t)
            confs.append(c)
    label = " ".join(words)[:80]
    confidence = round((sum(confs) / len(confs)) / 100, 2) if confs else 0.0
    return label, confidence


def _ink_ratio(ink: np.ndarray, box: Tuple[int, int, int, int]) -> float:
    x, y, w, h = box
    pad = 4
    region = ink[max(0, y + pad):y + h - pad, max(0, x + pad):x + w - pad]
    if region.size == 0:
        return 0.0
    return float(cv2.countNonZero(region)) / region.size


def _overlap_ratio(a0: float, a1: float, b0: float, b1: float) -> float:
    """How much of range b is covered by range a, as a fraction of b's width."""
    inter = max(0.0, min(a1, b1) - max(a0, b0))
    b_width = max(1.0, b1 - b0)
    return inter / b_width


# ---------------------------------------------------------------- structural extraction

def _structural_extraction(gray: np.ndarray) -> Optional[List[OcrReviewCell]]:
    ink = _ink_mask(gray)
    boxes = _detect_cell_boxes(ink)
    if len(boxes) < 20:
        return None

    rows = _cluster_rows(boxes)
    if len(rows) < len(DAYS) + 1:  # need at least a header row + 5 day rows
        return None

    # OCR every row's leftmost cell to find which rows are day rows
    day_row_indices: Dict[int, str] = {}
    for i, row in enumerate(rows):
        label, _ = _ocr_cell(gray, row[0])
        key = label[:3].lower()
        if key in DAY_HINTS:
            day_row_indices[i] = DAY_HINTS[key]

    if len(day_row_indices) < 3:  # too few recognizable day rows to trust this photo's structure
        return None

    first_day_row = min(day_row_indices.keys())
    header_rows = list(range(0, first_day_row))
    if not header_rows:
        return None

    # the "time header" row is whichever header row has the most time-pattern/"break" hits
    def score(row_idx: int) -> int:
        s = 0
        for box in rows[row_idx]:
            label, _ = _ocr_cell(gray, box)
            if TIME_PATTERN.search(label) or "break" in label.lower():
                s += 1
        return s

    time_row_idx = max(header_rows, key=score)
    time_row = rows[time_row_idx]

    # figure out where the day-label column ends, using the day rows' own first cell
    day_col_x_end = sorted(rows[i][0][0] + rows[i][0][2] for i in day_row_indices)[len(day_row_indices) // 2]

    # build period ranges (skipping the day-label header cell and any Break columns)
    period_ranges = []  # (x0, x1, period_index)
    period_counter = 0
    for box in time_row:
        x, y, w, h = box
        if x + w <= day_col_x_end + 5:
            continue  # this is the "Day/Time" label cell itself, not a period
        label, _ = _ocr_cell(gray, box)
        if "break" in label.lower():
            continue  # structurally excluded — never becomes a slot
        period_ranges.append((x, x + w, period_counter))
        period_counter += 1

    if period_counter != MAX_SLOTS:
        return None  # structure doesn't match a standard 8-period week — fall back rather than guess

    results: List[OcrReviewCell] = []
    for row_idx, day in day_row_indices.items():
        row = rows[row_idx]
        row_y0 = min(b[1] for b in row)
        row_y1 = max(b[1] + b[3] for b in row)
        data_cells = [b for b in row if b[0] + b[2] > day_col_x_end + 5]

        # OCR each data cell in this row once
        cell_info = [(_ocr_cell(gray, b), b) for b in data_cells]

        for x0, x1, period_idx in period_ranges:
            matches = []
            for (label, conf), box in cell_info:
                cx0, cx1 = box[0], box[0] + box[2]
                if _overlap_ratio(cx0, cx1, x0, x1) > OVERLAP_THRESHOLD and label:
                    matches.append((label, conf))

            if matches:
                # a merged cell naturally produces the same match for multiple periods
                label, confidence = _normalize(matches[0][0], matches[0][1])
            else:
                region_box = (int(x0), row_y0, int(x1 - x0), row_y1 - row_y0)
                if _ink_ratio(ink, region_box) < BLANK_INK_RATIO:
                    label, confidence = "Free", 1.0     # genuinely blank cell = a real free period
                else:
                    label, confidence = "", 0.0          # something's there but unreadable — flag, don't guess

            results.append(OcrReviewCell(day=day, slot_index=period_idx, guessed_label=label, confidence=confidence))

    # guarantee exactly 8 slots for exactly the 5 days, even if a day row was missed
    covered = {(c.day, c.slot_index) for c in results}
    for d in DAYS:
        for s in range(MAX_SLOTS):
            if (d, s) not in covered:
                results.append(OcrReviewCell(day=d, slot_index=s, guessed_label="", confidence=0.0))

    return results


# ---------------------------------------------------------------- fallback (unclear photos only)

def _word_cluster_fallback(gray: np.ndarray) -> List[OcrReviewCell]:
    data = pytesseract.image_to_data(gray, output_type=Output.DICT)
    words = []
    for i in range(len(data["text"])):
        text = data["text"][i].strip()
        conf = float(data["conf"][i]) if data["conf"][i] != "-1" else -1
        if text and conf > 30:
            words.append({"text": text, "conf": conf, "top": data["top"][i], "left": data["left"][i]})

    if not words:
        return [OcrReviewCell(day=d, slot_index=s, guessed_label="", confidence=0.0)
                for d in DAYS for s in range(MAX_SLOTS)]

    def cluster(values, gap_ratio=0.7):
        order = sorted(range(len(values)), key=lambda i: values[i])
        vals = [values[i] for i in order]
        gaps = [vals[i + 1] - vals[i] for i in range(len(vals) - 1)]
        threshold = (sum(gaps) / len(gaps)) * (1 + gap_ratio) if gaps else 0
        groups = [[order[0]]]
        for i in range(1, len(order)):
            if vals[i] - vals[i - 1] > max(threshold, 15):
                groups.append([])
            groups[-1].append(order[i])
        return groups

    row_groups = cluster([w["top"] for w in words])
    if len(row_groups) > len(DAYS):
        row_groups = row_groups[-len(DAYS):]

    results: List[OcrReviewCell] = []
    for row_i, idxs in enumerate(row_groups[: len(DAYS)]):
        day = DAYS[row_i]
        row_words = [words[i] for i in idxs]
        col_groups = cluster([w["left"] for w in row_words], gap_ratio=1.2)
        for slot_i in range(MAX_SLOTS):
            if slot_i < len(col_groups):
                cell_words = sorted([row_words[i] for i in col_groups[slot_i]], key=lambda w: w["left"])
                label = " ".join(w["text"] for w in cell_words)[:80]
                confidence = round(sum(w["conf"] for w in cell_words) / len(cell_words) / 100, 2)
                label, confidence = _normalize(label, confidence)
            else:
                label, confidence = "", 0.0
            results.append(OcrReviewCell(day=day, slot_index=slot_i, guessed_label=label, confidence=confidence))
    return results


# ---------------------------------------------------------------- entry point

def extract_grid_from_image(raw_bytes: bytes) -> List[OcrReviewCell]:
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError("Image too large (max 5 MB).")

    gray = _load_gray(raw_bytes)
    result = _structural_extraction(gray)
    return result if result is not None else _word_cluster_fallback(gray)