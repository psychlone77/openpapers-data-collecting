import os
import fitz
import io
from PIL import Image
import google.generativeai as genai

class OCRService:
    @staticmethod
    def extract_text_from_crop_gemini(pdf_path: str, page_idx: int, bbox: list) -> str:
        """
        Extract text from a specific bounding box in a PDF using Gemini 1.5 Flash.
        :param pdf_path: Path to the PDF document.
        :param page_idx: 0-indexed page number.
        :param bbox: [x0, y0, x1, y1] bounding box coordinates.
        :return: Extracted text as string.
        """
        try:
            doc = fitz.open(pdf_path)
            if page_idx < 0 or page_idx >= len(doc):
                raise ValueError("Page number out of bounds")
            
            page = doc[page_idx]
            
            # Check if bbox is normalized (all values <= 1.0)
            is_normalized = all(0 <= val <= 1.01 for val in bbox)
            if is_normalized:
                pw, ph = page.rect.width, page.rect.height
                bbox = [
                    bbox[0] * pw,
                    bbox[1] * ph,
                    bbox[2] * pw,
                    bbox[3] * ph
                ]
                
            # fitz.Rect takes (x0, y0, x1, y1)
            rect = fitz.Rect(*bbox)
            
            # Create a matrix for high DPI
            zoom = 300 / 72.0
            mat = fitz.Matrix(zoom, zoom)
            
            # Get the pixmap for the specific rect
            pix = page.get_pixmap(matrix=mat, clip=rect)
            
            # Convert to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            doc.close()
            
            # Configure Gemini
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                print("Warning: GEMINI_API_KEY not found in environment variables.")
                return ""
            
            genai.configure(api_key=api_key)
            
            # Initialize the model
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = (
                "Extract the exact text from this image block. "
                "Output ONLY the raw text. Do not add markdown blocks or commentary. "
                "If there are chemistry formulas, format them properly."
            )
            
            response = model.generate_content([prompt, img])
            return response.text.strip()
            
        except Exception as e:
            print(f"Failed to extract text using Gemini: {str(e)}")
            return ""
