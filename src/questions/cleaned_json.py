import json
import logging
import os
import base64
import ast

from utils.decorators import log_exceptions

logger = logging.getLogger(__name__)

@log_exceptions
def safe_parse_list(val):
    """Converts stringified list to list, returns [] if invalid or empty."""
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        if val.strip() == "[]":
            return []
        try:
            parsed = ast.literal_eval(val)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []

@log_exceptions
def convert_jpg_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read())
        return encoded_string.decode('utf-8')

@log_exceptions
def clean_jsons(input_dir: str, output_dir: str):
    for qtype in ["mcq"]:
        questions_dir = os.path.join(input_dir, qtype, "questions")
        images_dir = os.path.join(input_dir, qtype, "images")
        output_file = os.path.join(output_dir, f"{qtype}.json")

        all_questions = []

        for filename in sorted(os.listdir(questions_dir)):
            if not filename.endswith(".json"):
                continue

            filepath = os.path.join(questions_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                question_data = json.load(f)

            # --- Sanitize question_text ---
            if isinstance(question_data.get("question_text"), str) and question_data["question_text"].strip() == "[]":
                question_data["question_text"] = ""

            # --- Clean question_images ---
            base64_images = []
            raw_qimgs = safe_parse_list(question_data.get("question_images", []))
            for img_name in raw_qimgs:
                page_folder = img_name.split("_crop")[0]
                img_path = os.path.join(images_dir, page_folder, img_name)
                if os.path.exists(img_path):
                    base64_images.append(convert_jpg_to_base64(img_path))
                    logger.info(f"Converted {img_name} to base64")
                else:
                    logger.warning(f"Question image not found: {img_path.replace('\\', '/')}")
            question_data["question_images"] = base64_images

            # --- Clean option_image and sanitize option_text ---
            options = question_data.get("options")
            if options:
                for opt in options:
                    if isinstance(opt.get("option_text"), str) and opt["option_text"].strip() == "[]":
                        opt["option_text"] = ""

                    opt_img_field = opt.get("option_image")

                    if isinstance(opt_img_field, str):
                        if opt_img_field.strip() == "[]":
                            opt["option_image"] = ""
                        else:
                            img_name = opt_img_field.strip()
                            page_folder = img_name.split("_crop")[0]
                            img_path = os.path.join(images_dir, page_folder, img_name)
                            if os.path.exists(img_path):
                                opt["option_image"] = convert_jpg_to_base64(img_path)
                                logger.info(f"Converted option image {img_name} to base64")
                            else:
                                logger.warning(f"Option image not found: {img_path.replace('\\', '/')}")
                    elif isinstance(opt_img_field, list) and len(opt_img_field) > 0:
                        img_name = opt_img_field[0]
                        page_folder = img_name.split("_crop")[0]
                        img_path = os.path.join(images_dir, page_folder, img_name)
                        if os.path.exists(img_path):
                            opt["option_image"] = convert_jpg_to_base64(img_path)
                            logger.info(f"Converted option image {img_name} to base64")
                        else:
                            logger.warning(f"Option image not found: {img_path.replace('\\', '/')}")
                    else:
                        opt["option_image"] = ""

            all_questions.append(question_data)

        all_questions.sort(key=lambda q: q.get("question_number", 0))

        os.makedirs(output_dir, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(all_questions, f, indent=2)

        logger.info(f"Cleaned {len(all_questions)} questions into {output_file}")
