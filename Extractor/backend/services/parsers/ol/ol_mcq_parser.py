import re
from typing import List, Dict, Any, Tuple
from services.parsers.base_parser import BaseExamParser

class OLMCQParser(BaseExamParser):
    def parse(self, model_output: List[Dict[str, Any]], pdf_path: str = None, pdf_page_dims: Dict[int, Tuple[float, float]] = None) -> Tuple[str, List[Dict[str, Any]], Dict[str, str]]:
        bounding_boxes = []
        markdown_lines = []
        images_dict = {}
        
        pages = self._group_by_page(model_output)
        self._fix_element_order(pages)
        
        question_pattern = re.compile(r"^(\d+)\.\s+(.*)")
        option_pattern = re.compile(r"^\(\d+\)\s*(.*)")
        
        current_q = None
        
        def flush_question():
            if current_q:
                markdown_lines.append("")
                markdown_lines.append(f"::: Q {current_q['label']} :::")
                markdown_lines.append(f"@type {current_q['type']}")
                markdown_lines.append(f"@lang {self.language}")
                
                for line in current_q['prompt']:
                    markdown_lines.append(line)
                    
                if current_q['images']:
                    markdown_lines.append("@images")
                    for img in current_q['images']:
                        markdown_lines.append(img)
                        
                if current_q['options']:
                    markdown_lines.append("@options")
                    for opt in current_q['options']:
                        markdown_lines.append(opt)

        for page_idx in sorted(pages.keys()):
            for elem in pages[page_idx]:
                if not isinstance(elem, dict):
                    continue
                    
                elem_type = elem.get("type", "text")
                bbox = elem.get("bbox")
                
                # Bounding box generation
                pw, ph = (1.0, 1.0)
                if pdf_page_dims:
                    pw, ph = pdf_page_dims.get(page_idx, (1.0, 1.0))
                    
                bbox_id, nx0, ny0, nx1, ny1 = self._process_bounding_box(bbox, page_idx, pw, ph)
                
                if bbox_id:
                    bounding_boxes.append({
                        "id": bbox_id,
                        "type": elem_type,
                        "pageNumber": page_idx + 1,
                        "x0": nx0,
                        "y0": ny0,
                        "x1": nx1,
                        "y1": ny1,
                        "content": elem.get("text", "") or elem.get("content", "") or elem.get("table_body", "")
                    })

                # Ignore headers, footers, and page numbers from text parsing
                if elem_type in ["header", "footer", "page_number"]:
                    continue
                
                text = elem.get("content", "") or elem.get("text", "")
                
                is_image_elem = False
                if elem_type == "table":
                    text = elem.get("table_body", "") or text
                elif elem_type == "image":
                    is_image_elem = True
                    text = self._extract_image(pdf_path, page_idx, bbox_id, nx0, ny0, nx1, ny1, images_dict)
                    
                if not text:
                    continue
                
                text = self._standardize_math(text)
                    
                lines = text.split("\n")
                while lines:
                    line = lines.pop(0)
                    line_str = line.strip()
                    if not line_str:
                        continue
                        
                    q_match = question_pattern.match(line_str)
                    opt_match = option_pattern.match(line_str)
                    
                    if not current_q and not q_match:
                        continue
                    
                    if q_match:
                        flush_question()
                        prompt_text = q_match.group(2).strip() if q_match.group(2) else ""
                        
                        current_q = {
                            'label': q_match.group(1),
                            'type': "MCQ",
                            'prompt': [prompt_text] if prompt_text else [],
                            'images': [],
                            'options': [],
                            'has_options': False
                        }
                    elif opt_match:
                        if current_q:
                            current_q['has_options'] = True
                            current_q['options'].append(line_str)
                    else:
                        if current_q:
                            if is_image_elem:
                                current_q['images'].append(line_str)
                            else:
                                if current_q['has_options']:
                                    current_q['options'].append(line_str)
                                else:
                                    current_q['prompt'].append(line_str)
        
        flush_question()
        return "\n".join(markdown_lines), bounding_boxes, images_dict
