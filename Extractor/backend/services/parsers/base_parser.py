import re
import uuid
from typing import List, Dict, Any, Tuple

class BaseExamParser:
    def __init__(self, language: str = "en", paper_type: str = "MCQ"):
        self.language = language
        self.paper_type = paper_type

    def parse(self, model_output: List[Dict[str, Any]], pdf_path: str = None, pdf_page_dims: Dict[int, Tuple[float, float]] = None) -> Tuple[str, List[Dict[str, Any]], Dict[str, str]]:
        raise NotImplementedError("Subclasses must implement parse method")

    def _group_by_page(self, model_output: List[Dict[str, Any]]) -> Dict[int, List[Dict[str, Any]]]:
        pages = {}
        for page_idx, page_elements in enumerate(model_output):
            if isinstance(page_elements, list):
                pages[page_idx] = page_elements
            else:
                pages[page_idx] = [page_elements]
        return pages

    def _fix_element_order(self, pages: Dict[int, List[Dict[str, Any]]]):
        for page_idx in pages:
            elements = pages[page_idx]
            i = 0
            while i < len(elements):
                elem = elements[i]
                if isinstance(elem, dict) and elem.get("type", "text") == "text":
                    text = elem.get("content", "") or elem.get("text", "")
                    if re.match(r"^\(\d+\)\s*$", text.strip()):
                        j = i - 1
                        has_table = False
                        has_image = False
                        
                        while j >= 0:
                            prev_elem = elements[j]
                            if not isinstance(prev_elem, dict):
                                break
                            ptype = prev_elem.get("type", "text")
                            if ptype == "table":
                                if has_table: break
                                has_table = True
                            elif ptype == "image":
                                if has_image: break
                                has_image = True
                            else:
                                break
                            j -= 1
                            
                        if j + 1 < i:
                            opt_elem = elements.pop(i)
                            elements.insert(j + 1, opt_elem)
                i += 1

    def _process_bounding_box(self, bbox: List[float], page_idx: int, pw: float, ph: float) -> Tuple[str, float, float, float, float]:
        if not bbox or len(bbox) != 4:
            return None, 0, 0, 0, 0
            
        bbox_id = f"mineru-box-{uuid.uuid4().hex[:8]}"
        is_absolute = max(bbox) > 1.5 
        
        nx0 = bbox[0] / pw if is_absolute and pw > 1.0 else bbox[0]
        ny0 = bbox[1] / ph if is_absolute and ph > 1.0 else bbox[1]
        nx1 = bbox[2] / pw if is_absolute and pw > 1.0 else bbox[2]
        ny1 = bbox[3] / ph if is_absolute and ph > 1.0 else bbox[3]
        
        nx0 = max(0.0, min(1.0, nx0))
        ny0 = max(0.0, min(1.0, ny0))
        nx1 = max(0.0, min(1.0, nx1))
        ny1 = max(0.0, min(1.0, ny1))
        
        return bbox_id, nx0, ny0, nx1, ny1

    def _extract_image(self, pdf_path: str, page_idx: int, bbox_id: str, nx0: float, ny0: float, nx1: float, ny1: float, images_dict: Dict[str, str]) -> str:
        if pdf_path and bbox_id:
            try:
                from services.pdf_service import PDFService
                b64 = PDFService.extract_crop(pdf_path, page_idx, [nx0, ny0, nx1, ny1])
                images_dict[bbox_id] = b64
                return f"![image]({bbox_id})"
            except Exception as e:
                return f"[Image detected] <!-- error: {str(e)} -->"
        return "[Image detected]"

    def _standardize_math(self, text: str) -> str:
        text = text.replace(r'\(', '$').replace(r'\)', '$')
        text = text.replace(r'\[', '$$').replace(r'\]', '$$')
        return text
