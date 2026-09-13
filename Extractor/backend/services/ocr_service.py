import os
import fitz
import io
from PIL import Image
import google.generativeai as genai

class OCRService:
    @staticmethod
    def extract_text_from_crop_gemini(pdf_path: str, page_idx: int, bbox: list, is_table: bool = False) -> str:
        """
        Extract text from a specific bounding box in a PDF using Gemini 2.5 Flash.
        :param pdf_path: Path to the PDF document.
        :param page_idx: 0-indexed page number.
        :param bbox: [x0, y0, x1, y1] bounding box coordinates.
        :param is_table: Whether the bounding box contains a table.
        :return: Extracted text as string.
        """
        import time
        
        # Free tier limit was 15 RPM. With a paid key, we can significantly reduce or remove this.
        # Adding a tiny 0.1s delay just to prevent connection spam, but essentially it runs at full speed now!
        time.sleep(0.1)
        
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
            model = genai.GenerativeModel('gemini-3.6-flash')
            
            if is_table:
                prompt = (
                    "You are an expert OCR system specializing in Sinhala and English.\n"
                    "Extract the table from this image perfectly as a valid Markdown table.\n"
                    "Follow these rules strictly:\n"
                    "1. The table may contain a mix of Sinhala and English. Ensure Sinhala characters are extracted perfectly.\n"
                    "2. Use standard Markdown table syntax (e.g. | Column 1 | Column 2 |).\n"
                    "3. For mathematical or chemical formulas, use standard LaTeX enclosed in $ or $$.\n"
                    "4. Do NOT include any conversational text or commentary.\n"
                    "5. Do NOT wrap the output in markdown code blocks (e.g., ```markdown). Output ONLY the raw extracted table."
                )
            else:
                prompt = (
                    "You are an expert OCR system specializing in Sinhala and English text, as well as complex mathematical and chemical formulas.\n"
                    "Extract all text and formulas from this image exactly as they appear. Follow these rules strictly:\n"
                    "1. The text may contain a mix of Sinhala and English. Ensure Sinhala characters are extracted perfectly.\n"
                    "2. For mathematical or chemical formulas, use standard LaTeX enclosed in $ for inline formulas and $$ for block formulas.\n"
                    "3. PRESERVE the exact line breaks as they appear in the original document.\n"
                    "4. Keep multiple choice options (e.g., (1), (2)) on consecutive lines without blank lines between them.\n"
                    "5. CRITICAL: DO NOT attempt to visually replicate large horizontal white spaces from the image. ALWAYS use a single space between words, numbers, and variables. Never use tabs or multiple spaces.\n"
                    "6. Do NOT include any conversational text or commentary.\n"
                    "7. Do NOT wrap the output in markdown code blocks (e.g., ```markdown). Output ONLY the raw extracted content."
                )
            
            response = model.generate_content([prompt, img])
            extracted_text = response.text.strip()
            
            if not is_table:
                # Post-processing to collapse multiple spaces/tabs into a single space, 
                # while preserving actual newlines
                import re
                extracted_text = re.sub(r'[ \t]+', ' ', extracted_text)
            
            print(f"--- Gemini Extraction Result ---\n{extracted_text}\n--------------------------------")
            return extracted_text
            
        except Exception as e:
            print(f"Failed to extract text using Gemini: {str(e)}")
            return ""

    @staticmethod
    def extract_batch_from_page_gemini(pdf_path: str, page_idx: int, bboxes_info: list) -> dict:
        """
        Batch extract text from multiple bounding boxes on a single page using one Gemini API call.
        bboxes_info: list of dicts {"id": int, "bbox": [x0,y0,x1,y1], "type": "text"|"table"}
        Returns: dict mapping id (as string) to extracted text.
        """
        import time
        import json
        import re
        
        time.sleep(0.1)
        try:
            doc = fitz.open(pdf_path)
            if page_idx < 0 or page_idx >= len(doc):
                raise ValueError("Page number out of bounds")
            page = doc[page_idx]
            pw, ph = page.rect.width, page.rect.height
            zoom = 300 / 72.0
            mat = fitz.Matrix(zoom, zoom)
            
            crops = []
            
            for info in bboxes_info:
                bbox = info["bbox"]
                is_normalized = all(0 <= val <= 1.01 for val in bbox)
                if is_normalized:
                    bbox = [bbox[0]*pw, bbox[1]*ph, bbox[2]*pw, bbox[3]*ph]
                rect = fitz.Rect(*bbox)
                pix = page.get_pixmap(matrix=mat, clip=rect)
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                crops.append((info["id"], img, info["type"]))
                
            doc.close()
            
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                return {}
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-3.6-flash')
            
            prompt = (
                "You are an expert OCR system specializing in Sinhala and English text, mathematical formulas, and tables.\n"
                "I am providing multiple cropped images from a document. Extract the content for each image exactly as it appears.\n"
                "Rules:\n"
                "1. For text, preserve line breaks exactly. For formulas, use standard LaTeX enclosed in $ or $$.\n"
                "2. For tables, extract as valid Markdown table syntax.\n"
                "3. Keep multiple choice options on consecutive lines.\n"
                "4. Collapse multiple spaces into a single space.\n"
                "5. Return a JSON dictionary where keys are the image IDs and values are the extracted text strings.\n"
                "6. IMPORTANT: You must properly escape all backslashes in LaTeX for valid JSON (e.g., use \\\\rightarrow instead of \\rightarrow)."
            )
            
            content = [prompt]
            for id_val, img, elem_type in crops:
                type_hint = "table" if elem_type == "table" else "text"
                content.append(f"Image ID '{id_val}' ({type_hint}):")
                content.append(img)
                
            response = model.generate_content(
                content,
                generation_config=genai.GenerationConfig(response_mime_type="application/json")
            )
            result_text = response.text.strip()
            
            # Clean up markdown code block if present (though response_mime_type should prevent this)
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]
            
            try:
                results_dict = json.loads(result_text)
                
                # Post processing
                for k, v in results_dict.items():
                    elem_type = next((c[2] for c in crops if str(c[0]) == str(k)), "text")
                    if elem_type == "text" and isinstance(v, str):
                        results_dict[k] = re.sub(r'[ \t]+', ' ', v)
                        
                return results_dict
            except json.JSONDecodeError as e:
                print(f"Failed to parse Gemini batch response: {e}")
                print(f"Raw response: {result_text}")
                return {}
                
        except Exception as e:
            print(f"Failed to batch extract text using Gemini: {str(e)}")
            return {}

