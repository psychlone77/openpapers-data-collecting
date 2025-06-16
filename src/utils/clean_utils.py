import os
import shutil
import argparse
import logging
import json

from logging_config import setup_logger
from metadata import PROGRESS_LEVELS, rollback_metadata_to_step

# --- Setup CLI Arguments ---
parser = argparse.ArgumentParser(description="Debug utility for cleaning up PDF-related data.")
parser.add_argument("pdf", help="Name of the PDF (without .pdf extension). Use 'all' for all PDFs.")
parser.add_argument("--level", choices=["bronze", "silver", "gold_images", "gold_questions", "primary"],
                    default="bronze", help="Which level of data to delete. All the data upwards including the level specified will be deleted. Options: bronze, silver, gold_images, gold_questions, primary")
parser.add_argument("--debug", action="store_true", help="Enable debug logging")
args = parser.parse_args()

# --- Setup logger ---
setup_logger(debug=args.debug)
logger = logging.getLogger(__name__)
logger.info("Cleaning script started")

# --- Paths ---
BRONZE_DIR = "./data/Bronze"
SILVER_DIR = "./data/Silver"
GOLD_DIR = "./data/Gold"
PRIMARY_DIR = "./data/primary"
METADATA_PATH = "./data/metadata"

# --- Utility Functions ---
def delete_file(path: str):
    if os.path.isfile(path):
        os.remove(path)
        logger.info(f"Deleted file: {path.replace('\\', '/')}")
    else:
        logger.warning(f"File not found: {path.replace('\\', '/')}")

def delete_folder(path: str):
    if os.path.isdir(path):
        shutil.rmtree(path)
        logger.info(f"Deleted folder: {path.replace('\\', '/')}")
    else:
        logger.warning(f"Folder not found: {path.replace('\\', '/')}")

def cleanup(pdf_name: str, level: str):
    paths = {
        "bronze": os.path.join(BRONZE_DIR, f"{pdf_name}.pdf"),
        "silver": os.path.join(SILVER_DIR, pdf_name),
        "gold_images_mcq": os.path.join(GOLD_DIR, pdf_name, "mcq", "images"),
        "gold_questions_mcq": os.path.join(GOLD_DIR, pdf_name, "mcq", "questions"),
        "gold_images_structured": os.path.join(GOLD_DIR, pdf_name, "structured", "images"),
        "gold_questions_structured": os.path.join(GOLD_DIR, pdf_name, "structured", "questions"),
        "gold_images_essay": os.path.join(GOLD_DIR, pdf_name, "essay", "images"),
        "gold_questions_essay": os.path.join(GOLD_DIR, pdf_name, "essay", "questions"),
        "gold": os.path.join(GOLD_DIR, pdf_name),
        "primary": os.path.join(PRIMARY_DIR, pdf_name),
    }

    # Cascade deletions depending on level
    if level == "bronze":
        delete_file(paths["bronze"])
        delete_folder(paths["silver"])
        delete_folder(paths["gold"])
        rollback_metadata_to_step(pdf_name, "gold_to_primary")
        rollback_metadata_to_step(pdf_name, "unprocessed")
    elif level == "silver":
        delete_folder(paths["silver"])
        delete_folder(paths["gold"])
        rollback_metadata_to_step(pdf_name, "gold_to_primary")
        rollback_metadata_to_step(pdf_name, "bronze_to_silver")
    elif level == "gold_images":
        delete_folder(paths["gold"])
        rollback_metadata_to_step(pdf_name, "gold_to_primary")
        rollback_metadata_to_step(pdf_name, "silver_to_gold_i")
    elif level == "gold_questions":
        delete_folder(paths["gold_questions_mcq"])
        delete_folder(paths["gold_questions_structured"])
        delete_folder(paths["gold_questions_essay"])
        rollback_metadata_to_step(pdf_name, "gold_to_primary")
        rollback_metadata_to_step(pdf_name, "silver_gold_to_gold_q")
    elif level == "primary":
        delete_folder(paths["primary"])
        rollback_metadata_to_step(pdf_name, "gold_to_primary")

# --- Entry Point ---
if args.pdf == "all":
    pdfs = [f[:-4] for f in os.listdir(BRONZE_DIR) if f.endswith(".pdf")]
else:
    pdfs = [args.pdf]

for pdf in pdfs:
    logger.info(f"Cleaning {pdf} at level {args.level}")
    cleanup(pdf, args.level)

logger.info("Cleanup complete.")
