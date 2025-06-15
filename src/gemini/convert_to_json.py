import google.generativeai as genai
import re
import json
import os
import logging

from utils.decorators import log_exceptions
from gemini.prompts import *

logger = logging.getLogger(__name__)

@log_exceptions
def _generate_input(pages_dict: dict, images_dict: dict, qtype: str) -> list:
    """
    Prepares inputs (images + prompt) for the Gemini model depending on the question type.

    Args:
        pages_dict (dict): Mapping of page filenames to file paths.
        images_dict (dict): Mapping of cropped image filenames to file paths.
        qtype (str): Type of question ('mcq', 'structured', or 'essay').

    Returns:
        list: List of input parts to send to the Gemini model.
    """
    if qtype == "mcq":
        prompt = mcq_prompt
        inputs = []
        for page_name, page_path in pages_dict.items():
            parts = [{'mime_type': 'image/jpeg', 'data': open(page_path, 'rb').read()}]
            parts.append(prompt)

            # Include related cropped images whose names start with the page name
            related_images = {
                img_name: img_path for img_name, img_path in images_dict.items()
                if img_name.startswith(page_name.split('.')[0])
            }

            for img_name, img_path in related_images.items():
                parts.append(f'image_name: {img_name}')
                parts.append({'mime_type': 'image/jpeg', 'data': open(img_path, 'rb').read()})

            inputs.append(parts)
        return inputs

    # # Under development
    # elif qtype in ["essay", "structured"]:
    #     prompt = essay_prompt if qtype == "essay" else structured_prompt
    #     inputs = []

    #     for num in range(1, 11):
    #         qnum = num
    #         parts = []

    #         for page_name, page_path in sorted(pages_dict.items()):
    #             parts.append({'mime_type': 'image/jpeg', 'data': open(page_path, 'rb').read()})

    #         parts.append(prompt)
    #         parts.append(f"recognize the main questions and sub questions. only process main question {qnum} and its sub questions. ignore everything else. If there is no main question 1, return an empty JSON array.")

    #         for img_name, img_path in sorted(images_dict.items()):
    #             parts.append(f'image name: {img_name}')
    #             parts.append({'mime_type': 'image/jpeg', 'data': open(img_path, 'rb').read()})

    #         inputs.append(parts)

    #     return inputs

    else:
        raise ValueError(f"Unknown question type: {qtype}")

@log_exceptions
def _send_to_gemini(parts: list) -> genai.types.GenerateContentResponse:
    """
    Sends prepared input parts to Gemini and returns the response.

    Args:
        parts (list): Prepared list of prompt + image data.

    Returns:
        GenerateContentResponse: Gemini model response.
    """
    genai.configure(api_key='AIzaSyAINs8PoM0NLu0CgqJx0RdEjnEjzTQiD_Q')
    logger.info("Calling Gemini to convert pdf to json")
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(parts, generation_config={'temperature': 0})
    return response

@log_exceptions
def _extract_json_block(text: str) -> str:
    """
    Extracts the JSON portion from the Gemini model response.

    Handles the following cases:
    - ```json ... ```
    - ``` ... ```
    - Plain JSON (no backticks at all)

    Raises ValueError if a valid JSON-looking block is not found.
    """
    import re

    # Case 1: Look for ```json ... ```
    match = re.search(r"```json\s*(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Case 2: Look for ``` ... ``` without json
    match = re.search(r"```\s*(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Case 3: Try if whole text is valid JSON-ish block
    cleaned = text.strip()
    if cleaned.startswith("{") and cleaned.endswith("}"):
        return cleaned

    raise ValueError("No JSON block found in the response.")

@log_exceptions
def convert_to_json(input_dir: str, output_dir: str):
    """
    Main function to convert questions in images to JSON files by:
    - Generating input parts for Gemini
    - Sending them to the model
    - Extracting JSON blocks
    - Saving each question to a separate JSON file

    Args:
        input_dir (str): Directory containing question type folders with images.
        output_dir (str): Directory where output JSONs will be saved.
    """

    logger.info(f"Converting {input_dir.split('/')[-1]} to JSON")

    for qtype in ["mcq"]: # Loop over supported question types (only 'mcq' for now)
        logger.info(f"Processing question type: {qtype}")
        input_path = os.path.join(input_dir, qtype)
        image_path = os.path.join(output_dir, qtype, "images")
        output_path = os.path.join(output_dir, qtype, "questions")

        os.makedirs(output_path, exist_ok=True)

        if not os.path.exists(input_path):
            continue

        # Read page-level images
        logger.debug(f"Read | Pages | {input_path.replace('\\', '/')}")
        pages_dict = {
            f: os.path.join(input_path, f)
            for f in os.listdir(input_path)
            if f.lower().endswith(('.jpg', '.jpeg', '.png'))
        }

        # Read cropped image detections (grouped by page)
        logger.debug(f"Read | Images | {image_path.replace('\\', '/')}")
        images_dict = {}
        if os.path.exists(image_path):
            for folder in os.listdir(image_path):
                folder_path = os.path.join(image_path, folder)
                if os.path.isdir(folder_path):
                    for f in os.listdir(folder_path):
                        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                            images_dict[f] = os.path.join(folder_path, f)

        # Generate input prompts for Gemini
        generated_inputs = _generate_input(pages_dict, images_dict, qtype)

        # For each generated input, save JSON
        for part in generated_inputs:
            response = _send_to_gemini(part)
            content = response.candidates[0].content.parts[0].text
            logger.debug(f"Response from Gemini: {content}")
            logger.info("Parsing JSON content from Gemini response")
            # Extract JSON block and clean it
            json_data = _extract_json_block(content)
            json_data = re.sub(r'(?<!\\)\\(?![\\nrt"\'/bfu])', r'\\\\', json_data)
            parsed = json.loads(json_data)
            # if parsed == [] or parsed == {}:
            #     print(f"Empty JSON for {qtype} in {input_path}. Skipping.")
            #     break
            
            # Save each question to its own JSON file
            for question in parsed:
                q_number = question.get("question_number", "unknown")
                file_name = f"q{q_number}.json"
                with open(os.path.join(output_path, file_name), 'w', encoding='utf-8') as f:
                    json.dump(question, f, indent=4, ensure_ascii=False)
                logger.info(f"Saved question {q_number} to {file_name}")
            
    if not os.listdir(output_path):
        logger.warning(f"No questions were converted to json for {output_dir.replace('\\', '/').split('/')[-3]}")
    
    logger.debug(f"Write | Json | {output_path.replace('\\', '/')}")
