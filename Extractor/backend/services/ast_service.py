import re
import uuid
from typing import List, Dict, Any, Tuple

class ASTService:
    @staticmethod
    def parse_model_output_to_tree(model_output: List[Dict[str, Any]], pdf_path: str = None) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Parses MinerU model_output into a list of Question tree items, grouped by page,
        and also returns the extracted bounding boxes.
        """
        tree_items = []
        bounding_boxes = []
        
        # 1. First, group items by page (it's already a list of pages)
        pages = {}
        for page_idx, page_elements in enumerate(model_output):
            if isinstance(page_elements, list):
                pages[page_idx] = page_elements
            else:
                pages[page_idx] = [page_elements]
            
        question_pattern = re.compile(r"^(\d+)\.\s+(.*)")
        option_pattern = re.compile(r"^\(\d+\)\s+(.*)")
        subq_pattern = re.compile(r"^([a-zA-Z]\.|[ivxIVX]+\.|\([a-zA-Z]\)|\([ivxIVX]+\))\s+(.*)")
        
        order_counter = 0
        
        current_node_id = None
        current_content = []
        current_type = "question"
        current_parent_id = None
        
        latest_q_id = None
        latest_subq_id = None
        
        # Helper to commit current node
        def commit_node():
            nonlocal current_node_id, current_content, order_counter, current_type, current_parent_id
            if current_node_id and current_content:
                if not current_node_id.startswith("q-header-"):
                    tree_items.append({
                        "id": current_node_id,
                        "parentId": current_parent_id,
                        "type": current_type,
                        "content": "\n".join(current_content).strip(),
                        "order": order_counter
                    })
                    order_counter += 1
            current_node_id = None
            current_content = []
            
        # 2. Iterate through each page
        for page_idx in sorted(pages.keys()):
            for elem in pages[page_idx]:
                if not isinstance(elem, dict):
                    continue
                    
                elem_type = elem.get("type", "text")
                bbox = elem.get("bbox")
                
                # Generate unique ID and extract bounding box
                bbox_id = None
                if bbox and len(bbox) == 4:
                    bbox_id = f"mineru-box-{uuid.uuid4().hex[:8]}"
                    bounding_boxes.append({
                        "id": bbox_id,
                        "type": elem_type,
                        "pageNumber": page_idx + 1,
                        "x0": bbox[0],
                        "y0": bbox[1],
                        "x1": bbox[2],
                        "y1": bbox[3],
                        "content": elem.get("text", "") or elem.get("content", "") or elem.get("table_body", "")
                    })

                # MinerU puts the text in "content" or "text" or "text_body"
                text = elem.get("content", "") or elem.get("text", "")
                
                if elem_type == "table":
                    text = elem.get("table_body", "") or text
                elif elem_type == "image":
                    if pdf_path and bbox_id and bbox and len(bbox) == 4:
                        try:
                            from services.pdf_service import PDFService
                            b64 = PDFService.extract_crop(pdf_path, page_idx, bbox)
                            text = f"![{bbox_id}]({b64})"
                        except Exception as e:
                            text = f"[Image detected] <!-- error: {str(e)} -->"
                    else:
                        text = "[Image detected]"
                    
                if not text:
                    continue
                    
                # Split text by line to handle combined blocks
                lines = text.split("\n")
                for line in lines:
                    line_str = line.strip()
                    if not line_str:
                        continue
                        
                    q_match = question_pattern.match(line_str)
                    opt_match = option_pattern.match(line_str)
                    subq_match = subq_pattern.match(line_str)
                    
                    if q_match:
                        commit_node()
                        current_node_id = f"q-{uuid.uuid4().hex[:8]}"
                        current_type = "question"
                        current_parent_id = None
                        latest_q_id = current_node_id
                        latest_subq_id = None
                        current_content.append(line_str)
                    elif opt_match:
                        commit_node()
                        current_node_id = f"opt-{uuid.uuid4().hex[:8]}"
                        current_type = "option"
                        current_parent_id = latest_subq_id or latest_q_id
                        current_content.append(line_str)
                    elif subq_match:
                        commit_node()
                        current_node_id = f"subq-{uuid.uuid4().hex[:8]}"
                        current_type = "subquestion"
                        current_parent_id = latest_q_id
                        latest_subq_id = current_node_id
                        current_content.append(line_str)
                    else:
                        if not current_node_id:
                            current_node_id = f"q-header-{uuid.uuid4().hex[:8]}"
                            current_type = "question"
                            current_parent_id = None
                        current_content.append(line_str)
                    
        commit_node()
            
        return tree_items, bounding_boxes
