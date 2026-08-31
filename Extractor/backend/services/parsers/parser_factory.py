from services.parsers.base_parser import BaseExamParser
from services.parsers.al.al_mcq_parser import ALMCQParser
from services.parsers.al.al_essay_parser import ALEssayParser
from services.parsers.al.al_structured_parser import ALStructuredParser
from services.parsers.ol.ol_mcq_parser import OLMCQParser
from services.parsers.ol.ol_essay_parser import OLEssayParser
from services.parsers.ol.ol_structured_parser import OLStructuredParser

class ParserFactory:
    @staticmethod
    def get_parser(exam_type: str, language: str = "en", paper_type: str = "MCQ") -> BaseExamParser:
        """
        Returns the appropriate parser strategy based on exam_type and paper_type.
        """
        exam_type = exam_type.upper() if exam_type else "UNKNOWN"
        paper_type = paper_type.upper() if paper_type else "MCQ"
        
        if "A/L" in exam_type or "AL" in exam_type:
            if paper_type == "MCQ":
                return ALMCQParser(language=language, paper_type=paper_type)
            elif paper_type in ["STRUCTURED", "STRUCTURED_ESSAY", "STRUCTURED ESSAY"]:
                return ALStructuredParser(language=language, paper_type=paper_type)
            else:
                return ALEssayParser(language=language, paper_type=paper_type)
        elif "O/L" in exam_type or "OL" in exam_type:
            if paper_type == "MCQ":
                return OLMCQParser(language=language, paper_type=paper_type)
            elif paper_type in ["STRUCTURED", "STRUCTURED_ESSAY", "STRUCTURED ESSAY"]:
                return OLStructuredParser(language=language, paper_type=paper_type)
            else:
                return OLEssayParser(language=language, paper_type=paper_type)
        elif "UNKNOWN" in exam_type:
            # Fallback for old tasks in the database that don't have an examType
            return OLMCQParser(language=language, paper_type=paper_type)
        
        # Example of how to add a new exam type:
        # elif "NEW_EXAM" in exam_type:
        #     return NewExamParser(language=language, paper_type=paper_type)
        
        raise ValueError(f"No parser implemented for exam type: {exam_type}. Please add it to ParserFactory.")
