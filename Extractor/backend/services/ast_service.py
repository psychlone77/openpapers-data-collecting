import re
import uuid
from typing import List, Dict, Any, Tuple
from services.parsers.parser_factory import ParserFactory

class ASTService:
    @staticmethod
    def parse_model_output_to_curation_markdown(model_output: List[Dict[str, Any]], pdf_path: str = None, language: str = "en", paper_type: str = "MCQ", exam_type: str = "unknown", selected_pages: List[int] = None) -> Tuple[str, List[Dict[str, Any]], Dict[str, str]]:
        """
        Parses MinerU JSON output into the new Curation Syntax markdown, bounding boxes, and images dict.
        Delegates the actual parsing logic to the appropriate parser strategy based on exam_type.
        """
        parser = ParserFactory.get_parser(exam_type=exam_type, language=language, paper_type=paper_type)
        
        # We can also pass pdf_page_dims logic here or let parser handle it
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
                
        return parser.parse(model_output=model_output, pdf_path=pdf_path, pdf_page_dims=pdf_page_dims)
