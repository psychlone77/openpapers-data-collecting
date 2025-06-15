from pdf2image import convert_from_path
import logging
import io
import cv2
import numpy as np
from PIL import Image
import google.generativeai as genai
import os
import io
import json

from utils.decorators import log_exceptions

logger = logging.getLogger(__name__)

@log_exceptions
def _preprocess_image(img: np.ndarray) -> np.ndarray:

    """
    Preprocess the extracted image for better OCR and analysis.
    Steps:
    - Convert to grayscale
    - Threshold to remove watermark
    - Blur to denoise
    - Sharpen to enhance text
    - Deskew using Hough Line detection
    """

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    
    # Remove the watermark
    # Threshold to keep dark (black) text; values above 180 are turned white
    _, mask = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)

    # Step 1: Denoise the image using Gaussian Blur
    blurred = cv2.GaussianBlur(mask, (7, 7), 0)

    # Step 2: Sharpen the image to make text more prominent
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])  # Sharpening kernel
    sharpened = cv2.filter2D(blurred, -1, kernel)

    # Step 3: Apply adaptive thresholding to enhance text regions (Light text on dark background)
    # final_thresh = cv2.adaptiveThreshold(
    #     sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    # )

    # Step 4: Deskew the image
    # Create an inverted B&W copy using Otsu (automatic) thresholding

    height, width = img.shape[:2]
    im_bw = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]

    # Detect lines in this image. Parameters here mostly arrived at by trial and error.
    lines = cv2.HoughLinesP(
        im_bw, 1, np.pi / 180, 200, minLineLength=width / 12, maxLineGap=width / 150
    )

    # Collect the angles of these lines (in radians)
    angles = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angles.append(np.arctan2(y2 - y1, x2 - x1))

    # Filter the angles to remove outliers based on max_skew
    angles = [angle for angle in angles if abs(angle) < np.deg2rad(10)]

    if len(angles) < 5:
        # Insufficient data to deskew
        return sharpened

    # Average the angles to a degree offset
    angle_deg = np.rad2deg(np.median(angles))

    # Rotate the image by the residual offset
    M = cv2.getRotationMatrix2D((width / 2, height / 2), angle_deg, 1)
    im = cv2.warpAffine(sharpened, M, (width, height), borderMode=cv2.BORDER_REPLICATE)
    return im

@log_exceptions
def _extract_json_block(text: str) -> str:
    """
    Extracts the JSON portion from the Gemini model response.

    Handles the following cases:
    - ```json ... ```
    - ``` ... ```
    - Plain JSON (no backticks at all)

    Raises ValueError if a valid JSON-looking block is not found.
    """
    import re

    # Case 1: Look for ```json ... ```
    match = re.search(r"```json\s*(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Case 2: Look for ``` ... ``` without json
    match = re.search(r"```\s*(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Case 3: Try if whole text is valid JSON-ish block
    cleaned = text.strip()
    if cleaned.startswith("{") and cleaned.endswith("}"):
        return cleaned

    raise ValueError("No JSON block found in the response.")


@log_exceptions
def _organize_pdf_pages(pages: dict, path: str):
    """
    Classifies pages using Gemini into 'mcq', 'structured', 'essay', or 'other'.
    Saves each page into the corresponding folder.
    """

    prompt = """
    This is a set images off of a paper, check if they is consisting of mcq, structured questions or essay questions.
    1. mcq questions will have a question and 5 answers to them.
    2. structured questions will have questions with space left to be answered.
    3. essay questions will be large questions with no answers to choose from or no space to answer on the paper
    the main difference between structured and essay is that essay structured questions have space left for answering marked by dotted lines, whereas essay questions have no specified space for answering
    classify the question type on the paper, and give the all types as a dictionary of the page number as 'page_n' vs single word (choices - mcq, structured, essay). some pages may not fit either of the three, classify them as 'other', these are mostly information and blank pages.
    For further help, refer to the page numbers as can be found either top or bottom of the page. Most likely, the same type of questions will be on nearby pages. If pages 1-4 are mcq and 7-8 are also mcq, then page 5 and 6 are likely to be mcq as well. And pages that may be classified as "other" are most likely to be a separator between question types. it is unlikely for the same question type to be on two sides of an "other". And recognize the subject. For physics and chemistry, there will be 50 mcqs(numbered 1-50), 4 structured questions(numbered 1-4) and 6 essay questions(numbered 5-10).
    Return only the JSON string in a human readable format, do not wrap it in markdown or code blocks.
    """

    genai.configure(api_key='AIzaSyAINs8PoM0NLu0CgqJx0RdEjnEjzTQiD_Q')
    model = genai.GenerativeModel('gemini-1.5-flash')

    parts = [prompt]

    for name, page in pages.items():
        parts.append(f'page name: {name}')
        parts.append({'mime_type': 'image/jpeg', 'data': page})

    logger.info("Calling Gemini to organize the pages by question type")
    response = model.generate_content(
        parts,
        generation_config={'temperature': 0}
    )

    # Extract JSON string and parse to dictionary
    question_types_dict = response.candidates[0].content.parts[0].text
    logger.debug(f"Response from Gemini: {question_types_dict}")

    cleaned_dict = _extract_json_block(question_types_dict)
    questions_json = json.loads(cleaned_dict)

    # Ensure the target folders exist
    for question_type in ['mcq', 'structured', 'essay', 'other']:
        folder_path = os.path.join(path, question_type)
        os.makedirs(folder_path, exist_ok=True)

    # Save each image to the corresponding folder
    for name, type in questions_json.items():
        page = pages.get(f'{name}.png')
        with Image.open(io.BytesIO(page)) as pg:
            pg.save(f'{path}/{type}/{name}.png')
        logger.info(f"{name} saved to {type}")

    for question_type in ['mcq', 'structured', 'essay']:
        folder_path = os.path.join(path, question_type)
        if not os.listdir(folder_path):
            logger.warning(f"The folder '{folder_path}' is empty after organizing pages of {path.split("/")[-1]}.")
    
    logger.debug(f"Write | Pages | {path}")

@log_exceptions
def pdf_to_pages(pdf_path: str, output_path: str):
    """
    Converts a PDF into individual preprocessed image pages.
    Then organizes those pages by question type using Gemini.
    """

    logger.info(f"Converting {pdf_path.split("/")[-1]} to images")
    logger.debug(f"Read | PDF | {pdf_path}")

    # Convert PDF to images
    try:
        pages = convert_from_path(pdf_path, dpi=300)
    except FileNotFoundError as e:
        logger.error(f"PDF file not found: {pdf_path}")
        e._already_logged = True
        raise e
    
    logger.info(f"Converted {len(pages)} pages")
    
    pages_dict = {}
    for i, page in enumerate(pages):
        # Convert PIL image to NumPy array
        img_np = np.array(page)

        # Preprocess the image
        processed_img = _preprocess_image(img_np)

        # Convert processed image (NumPy array) back to PIL Image for saving as JPEG bytes
        pil_img = Image.fromarray(processed_img)
        img_byte = io.BytesIO()
        pil_img.save(img_byte, format='JPEG')
        img_bytes = img_byte.getvalue()

        # Use a consistent file name, e.g., page_1.png, page_2.png, ...
        file_name = f"page_{i + 1}.png"
        pages_dict[file_name] = img_bytes

        logger.info(f"Preprocessed {file_name}")

    # Classify and organize images
    _organize_pdf_pages(pages_dict, output_path)