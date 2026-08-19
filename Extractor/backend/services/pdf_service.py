import fitz  # PyMuPDF
import io
import base64
from typing import List

class PDFService:
    @staticmethod
    def extract_crop(pdf_path: str, page_number: int, bbox: List[float], dpi: int = 300) -> str:
        """
        Extracts a specific bounding box from a PDF page and returns a base64 encoded PNG.
        :param pdf_path: Path to the PDF document.
        :param page_number: 0-indexed page number.
        :param bbox: [x0, y0, x1, y1] bounding box coordinates.
        :param dpi: Resolution for the extraction.
        :return: Base64 encoded PNG string.
        """
        try:
            doc = fitz.open(pdf_path)
            if page_number < 0 or page_number >= len(doc):
                raise ValueError("Page number out of bounds")
            
            page = doc[page_number]
            # fitz.Rect takes (x0, y0, x1, y1)
            rect = fitz.Rect(*bbox)
            
            # Create a matrix for the given DPI
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)
            
            # Get the pixmap for the specific rect
            pix = page.get_pixmap(matrix=mat, clip=rect)
            
            # Convert to PNG base64
            img_data = pix.tobytes("png")
            b64_string = base64.b64encode(img_data).decode("utf-8")
            
            doc.close()
            return f"data:image/png;base64,{b64_string}"
        except Exception as e:
            raise Exception(f"Failed to extract crop: {str(e)}")
