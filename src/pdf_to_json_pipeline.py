import os
import logging
import argparse

from pdf.split_to_pages import pdf_to_pages
from images.image_extract import extract_images
from gemini.convert_to_json import convert_to_json
from utils.logging_config import setup_logger
from utils.metadata import read_metadata, update_step_metadata, PROGRESS_LEVELS

# TODO: add the debug utils for deleting stuff
# TODO: Change the prompt to recognize correct images for questions

# --- Parse CLI arguments ---
parser = argparse.ArgumentParser(description="Run the PDF processing pipeline.")
parser.add_argument("--debug", action="store_true", help="Enable debug logging.")
args = parser.parse_args()

# --- Setup logger ---
setup_logger(debug=args.debug)
logger = logging.getLogger(__name__)
logger.info("Main script started\n\n")

# --- Define data directories ---
global_bronze_path = "./data/Bronze/"
global_silver_path = "./data/Silver/"
global_gold_path = "./data/Gold/"

if not os.path.exists(global_bronze_path):
    logger.error(f"Bronze directory does not exist: {global_bronze_path}")
if not os.listdir(global_bronze_path):
    logger.warning("No PDF files found in the Bronze directory.")

# --- Ensure directory structure exists ---
os.makedirs(global_bronze_path, exist_ok=True)
os.makedirs(global_silver_path, exist_ok=True)
os.makedirs(global_gold_path, exist_ok=True)

# --- Process each PDF file in the Bronze directory ---
for file in os.listdir(global_bronze_path):
    if not file.endswith(".pdf"):
        continue # Skip non-PDF files
        
    pdf = file.split(".")[0]
    logger.info(f"Processing {pdf}\n")
    
    bronze_path = os.path.join(global_bronze_path, file)
    logger.debug(f"Bronze path: {bronze_path}")
    
    silver_path = os.path.join(global_silver_path, pdf)
    logger.debug(f"Silver path: {silver_path}")
    
    gold_path = os.path.join(global_gold_path, pdf)
    logger.debug(f"Gold path: {gold_path}")

    # --- Read metadata and determine progress ---
    metadata = read_metadata(pdf)
    progress = metadata.get("progress", 0)
    logger.info(f"Current progress for {pdf}: {progress}.")

    remaining_steps = [
        step for step, level in PROGRESS_LEVELS.items()
        if level > progress
    ]

    if remaining_steps:
        logger.info(f"Steps remaining for {pdf}: {', '.join(remaining_steps)}\n")
    else:
        logger.info(f"All steps already completed for {pdf}.\n")

    # --- Step 1: Convert PDF to image pages (Bronze → Silver) ---
    if progress < PROGRESS_LEVELS["bronze_to_silver"]:
        pdf_to_pages(bronze_path, silver_path)
        logger.info(f"Converted PDF to pages\n")
        update_step_metadata(
            pdf_name = pdf,
            step = "bronze_to_silver",
            source_layer = "Bronze",
            source_path = bronze_path,
            target_layer = "Silver",
            target_path = silver_path
        )

    # --- Step 2: Extract images from pages (Silver → Gold_Images) ---
    if progress < PROGRESS_LEVELS["silver_to_gold_i"]:
        extract_images(silver_path, gold_path)
        logger.info(f"Extracted images from pages\n")
        update_step_metadata(
            pdf_name = pdf,
            step = "silver_to_gold_i",
            source_layer = "Silver",
            source_path = silver_path,
            target_layer = "Gold_Images",
            target_path = gold_path
        )

    # --- Step 3: Send pages + images to Gemini and save JSON (Silver + Gold_Images → Gold_Questions) ---
    if progress < PROGRESS_LEVELS["silver_gold_to_gold_q"]:
        convert_to_json(silver_path, gold_path)
        logger.info(f"Converted questions to JSON\n")
        update_step_metadata(
            pdf_name = pdf,
            step = "silver_gold_to_gold_q",
            source_layer = "Silver + Gold_Images",
            source_path = f"{silver_path}, {gold_path}",
            target_layer = "Gold_Questions",
            target_path = gold_path
        )

    logger.info(f"Finished processing {pdf}.\n\n")

logger.info("Main script completed successfully.")
