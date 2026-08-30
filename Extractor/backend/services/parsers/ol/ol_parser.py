import re
from typing import List, Dict, Any, Tuple
from services.parsers.base_parser import BaseExamParser

class OLParser(BaseExamParser):
    def parse(self, model_output: List[Dict[str, Any]], pdf_path: str = None, pdf_page_dims: Dict[int, Tuple[float, float]] = None) -> Tuple[str, List[Dict[str, Any]], Dict[str, str]]:
        bounding_boxes = []
        markdown_lines = []
        images_dict = {}
        
        pages = self._group_by_page(model_output)
        self._fix_element_order(pages)
        
        question_pattern = re.compile(r"^(\d+)\.\s+(.*)")
        option_pattern = re.compile(r"^\(\d+\)\s*(.*)")
        subq_pattern = re.compile(r"^([a-zA-Z]\.|[ivxIVX]+\.|\([a-zA-Z]\)|\([ivxIVX]+\))\s+(.*)")
        
        current_q = None
        active_q_num = None
        active_part = None
        active_subpart = None
        
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
                    subq_match = subq_pattern.match(line_str)
                    
                    if not current_q and not q_match:
                        continue
                    
                    if q_match:
                        flush_question()
                        active_q_num = q_match.group(1)
                        active_part = None
                        active_subpart = None
                        
                        prompt_text = q_match.group(2).strip() if q_match.group(2) else ""
                        nested_subq = subq_pattern.match(prompt_text) if prompt_text else None
                        
                        current_q = {
                            'label': active_q_num,
                            'type': "MCQ" if self.paper_type.upper() == "MCQ" else "CONTAINER",
                            'prompt': [] if nested_subq else ([prompt_text] if prompt_text else []),
                            'images': [],
                            'options': [],
                            'has_options': False
                        }
                        
                        if nested_subq:
                            lines.insert(0, prompt_text)
                            
                    elif subq_match and self.paper_type.upper() != "MCQ":
                        flush_question()
                        subq_label = subq_match.group(1).replace(".", "").replace("(", "").replace(")", "").strip()
                        
                        lbl_lower = subq_label.lower()
                        is_sub = False
                        if lbl_lower in ["ii", "iii", "iv", "vi", "vii", "viii", "ix"]:
                            is_sub = True
                        elif lbl_lower == "i":
                            is_sub = True
                        elif lbl_lower == "v" and active_subpart and active_subpart.lower() in ["iv", "iii"]:
                            is_sub = True
                        elif lbl_lower == "x" and active_subpart and active_subpart.lower() in ["ix", "viii"]:
                            is_sub = True
                            
                        if is_sub:
                            active_subpart = subq_label
                        else:
                            active_part = subq_label
                            active_subpart = None
                            
                        parts = [active_q_num] if active_q_num else []
                        if active_part: parts.append(active_part)
                        if active_subpart: parts.append(active_subpart)
                        
                        label = ".".join(parts) if parts else subq_label
                        
                        prompt_text = subq_match.group(2).strip() if subq_match.group(2) else ""
                        nested_subq = subq_pattern.match(prompt_text) if prompt_text else None
                        
                        q_type = "CONTAINER" if nested_subq else ("STRUCTURED ESSAY" if self.paper_type.upper() in ["STRUCTURED", "STRUCTURED ESSAY", "STRUCTURED_ESSAY"] else "ESSAY")
                        
                        current_q = {
                            'label': label,
                            'type': q_type,
                            'prompt': [] if nested_subq else ([prompt_text] if prompt_text else []),
                            'images': [],
                            'options': [],
                            'has_options': False
                        }
                        
                        if nested_subq:
                            lines.insert(0, prompt_text)
                    elif opt_match:
                        if current_q:
                            current_q['has_options'] = True
                            current_q['options'].append(line_str)
                    else:
                        if current_q:
                            if is_image_elem:
                                if current_q['has_options']:
                                    current_q['options'].append(line_str)
                                else:
                                    current_q['images'].append(line_str)
                            else:
                                if current_q['has_options']:
                                    current_q['options'].append(line_str)
                                else:
                                    current_q['prompt'].append(line_str)
        
        flush_question()
        return "\n".join(markdown_lines), bounding_boxes, images_dict
