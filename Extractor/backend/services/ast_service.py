import re
import uuid
from typing import List, Dict, Any, Tuple

class ASTService:
    @staticmethod
    def parse_model_output_to_curation_markdown(model_output: List[Dict[str, Any]], pdf_path: str = None, language: str = "en", paper_type: str = "MCQ", selected_pages: List[int] = None) -> Tuple[str, List[Dict[str, Any]], Dict[str, str]]:
        """
        Parses MinerU JSON output into the new Curation Syntax markdown, bounding boxes, and images dict.
        """
        bounding_boxes = []
        markdown_lines = []
        images_dict = {}
        
        # 1. First, group items by page (it's already a list of pages)
        pages = {}
        for page_idx, page_elements in enumerate(model_output):
            if isinstance(page_elements, list):
                pages[page_idx] = page_elements
            else:
                pages[page_idx] = [page_elements]
                
        # 1.5 Get PDF page dimensions to normalize bounding boxes
        pdf_page_dims = {}
        if pdf_path:
            import fitz
            try:
                doc = fitz.open(pdf_path)
                for i in range(len(doc)):
                    pdf_page_dims[i] = (doc[i].rect.width, doc[i].rect.height)
                doc.close()
            except Exception as e:
                print(f"Failed to get PDF dimensions: {e}")
            
        # Fix element order for standalone options (MinerU often puts diagrams/tables before the option number)
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
                
        question_pattern = re.compile(r"^(\d+)\.\s+(.*)")
        option_pattern = re.compile(r"^\(\d+\)\s*(.*)")
        subq_pattern = re.compile(r"^([a-zA-Z]\.|[ivxIVX]+\.|\([a-zA-Z]\)|\([ivxIVX]+\))\s+(.*)")
        
        current_q = None
        
        def flush_question():
            if current_q:
                markdown_lines.append("")
                markdown_lines.append(f"::: Q {current_q['label']} :::")
                markdown_lines.append(f"@type {current_q['type']}")
                markdown_lines.append(f"@lang {language}")
                
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
                bbox_id = None
                if bbox and len(bbox) == 4:
                    bbox_id = f"mineru-box-{uuid.uuid4().hex[:8]}"
                    original_page_number = selected_pages[page_idx] if selected_pages and page_idx < len(selected_pages) else page_idx + 1
                    
                    # Normalize bounding box using PDF dimensions if available
                    pw, ph = pdf_page_dims.get(page_idx, (1.0, 1.0))
                    # If dimensions weren't found, keep original values
                    
                    nx0 = bbox[0] / pw if pw > 1.0 else bbox[0]
                    ny0 = bbox[1] / ph if ph > 1.0 else bbox[1]
                    nx1 = bbox[2] / pw if pw > 1.0 else bbox[2]
                    ny1 = bbox[3] / ph if ph > 1.0 else bbox[3]
                    
                    # Clamp to [0, 1]
                    nx0 = max(0.0, min(1.0, nx0))
                    ny0 = max(0.0, min(1.0, ny0))
                    nx1 = max(0.0, min(1.0, nx1))
                    ny1 = max(0.0, min(1.0, ny1))
                    
                    bounding_boxes.append({
                        "id": bbox_id,
                        "type": elem_type,
                        "pageNumber": original_page_number,
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
                    if pdf_path and bbox_id and bbox and len(bbox) == 4:
                        try:
                            from services.pdf_service import PDFService
                            b64 = PDFService.extract_crop(pdf_path, page_idx, [nx0, ny0, nx1, ny1])
                            text = f"![image]({bbox_id})"
                            images_dict[bbox_id] = b64
                        except Exception as e:
                            text = f"[Image detected] <!-- error: {str(e)} -->"
                    else:
                        text = "[Image detected]"
                    
                if not text:
                    continue
                
                # Standardize LaTeX delimiters to markdown math delimiters for remark-math compatibility
                text = text.replace(r'\(', '$').replace(r'\)', '$')
                text = text.replace(r'\[', '$$').replace(r'\]', '$$')
                    
                lines = text.split("\n")
                for line in lines:
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
                        current_q = {
                            'label': q_match.group(1),
                            'type': "MCQ" if paper_type.upper() == "MCQ" else "CONTAINER",
                            'prompt': [q_match.group(2)] if q_match.group(2) else [],
                            'images': [],
                            'options': [],
                            'has_options': False
                        }
                    elif subq_match and paper_type.upper() != "MCQ":
                        flush_question()
                        subq_label = subq_match.group(1).replace(".", "").replace("(", "").replace(")", "")
                        parent_label = current_q['label'] if current_q else ""
                        label = f"{parent_label}.{subq_label}" if parent_label else subq_label
                        
                        current_q = {
                            'label': label,
                            'type': "ESSAY",
                            'prompt': [subq_match.group(2)] if subq_match.group(2) else [],
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
