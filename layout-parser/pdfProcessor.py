import cv2
import numpy as np
from PIL import Image
import os
import fitz 

def preprocess_image(img):

    """Preprocess the extracted image for better OCR and analysis without making the background dark."""

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


def pdf_to_images(pdf_path, output_folder):
    """Convert PDF pages to images and apply preprocessing."""

    doc = fitz.open(pdf_path)
    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]  # Extract PDF name without extension
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)  # Load page
        pix = page.get_pixmap(dpi=300)  # Render at 300 DPI
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)  # Convert to NumPy array

        # Preprocess the image
        processed_img = preprocess_image(img)

        print(f"Processing page {page_num + 1} of {pdf_name}...")
        # Save processed image
        output_path = os.path.join(output_folder, f"{pdf_name}_page_{page_num + 1}.png")
        Image.fromarray(processed_img).save(output_path)
    
    doc.close()  # Close the document

# Main script
input_folder = "data/raw"
output_folder = "data/intermediate"

# Ensure output folder exists
os.makedirs(output_folder, exist_ok=True)

# Process all PDFs in the input folder
for pdf_name in os.listdir(input_folder):
    if pdf_name.endswith(".pdf"):  # Check if the file is a PDF
        pdf_path = os.path.join(input_folder, pdf_name)
        
        # Create a folder for each PDF in the output folder
        pdf_output_folder = os.path.join(output_folder, os.path.splitext(pdf_name)[0])
        os.makedirs(pdf_output_folder, exist_ok=True)
        
        # Process the PDF and save images in the corresponding folder
        pdf_to_images(pdf_path, pdf_output_folder)
