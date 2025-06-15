import logging
import json
import os
from datetime import datetime

try:
    from utils.decorators import log_exceptions
except:
    from decorators import log_exceptions

logger = logging.getLogger(__name__)

METADATA_DIR = "./data/metadata/"

# Mapping of step names to numeric progress levels
PROGRESS_LEVELS = {
    "unprocessed": 0,
    "bronze_to_silver": 1,
    "silver_to_gold_i": 2,
    "silver_gold_to_gold_q": 3,
}

@log_exceptions
def _get_metadata_path(pdf_name: str) -> str:
    """
    Generates the full path for a metadata file based on the given PDF name.
    Creates the metadata directory if it doesn't exist.

    Parameters:
    - pdf_name (str): The base name of the PDF (without extension).

    Returns:
    - str: Full path to the metadata JSON file.
    """
    if not os.path.exists(METADATA_DIR):
        os.makedirs(METADATA_DIR, exist_ok=True)
        logger.warning(f"Metadata directory not found, created at {METADATA_DIR}")
    return os.path.join(METADATA_DIR, f"{pdf_name}.json")

@log_exceptions
def read_metadata(pdf_name: str) -> dict:
    """
    Reads the metadata JSON file for the given PDF.

    If the metadata file doesn't exist, returns a default dictionary.

    Parameters:
    - pdf_name (str): The base name of the PDF.

    Returns:
    - dict: Metadata dictionary.
    """
    path = _get_metadata_path(pdf_name)
    if not os.path.exists(path):
        logger.info(f"Metadata file not found for {pdf_name}")
        return {
            "pdf": f"{pdf_name}.pdf",
            "progress": 0,
            "steps": {}
        }
    with open(path, 'r') as f:
        return json.load(f)

@log_exceptions
def _write_metadata(pdf_name: str, metadata: dict):
    """
    Writes the metadata dictionary to a JSON file.

    Parameters:
    - pdf_name (str): The base name of the PDF.
    - metadata (dict): Metadata content to write.
    """
    os.makedirs(METADATA_DIR, exist_ok=True)
    path = _get_metadata_path(pdf_name)
    with open(path, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Metadata for {pdf_name} written to {path}")
    logger.debug(f"Metadata content: {json.dumps(metadata, indent=2)}")

@log_exceptions
def update_step_metadata(pdf_name: str, step: str, source_layer: str, source_path: str,
                         target_layer: str, target_path: str):
    """
    Updates the metadata file with information about a completed step.

    Parameters:
    - pdf_name (str): The base name of the PDF.
    - step (str): Name of the pipeline step (e.g., "bronze_to_silver").
    - source_layer (str): Name of the source layer.
    - source_path (str): Path to the source data.
    - target_layer (str): Name of the target layer.
    - target_path (str): Path to the target data.
    """
    metadata = read_metadata(pdf_name)

    # Update progress if the step is in the predefined mapping
    metadata["progress"] = PROGRESS_LEVELS.get(step, metadata.get("progress", 0))

    # Update or add step-specific metadata
    metadata["steps"][step] = {
        "status": "done",
        "source_layer": source_layer,
        "source_path": source_path,
        "target_layer": target_layer,
        "target_path": target_path,
        "timestamp": datetime.now().isoformat()
    }

    metadata["last_modified"] = datetime.now().isoformat()

    _write_metadata(pdf_name, metadata)

@log_exceptions
def rollback_metadata_to_step(pdf_name: str, step: str):
    """
    Rolls back metadata progress to a given step.
    All metadata for steps beyond this step will be removed.

    Parameters:
    - pdf_name (str): Name of the PDF (without .pdf).
    - step (str): The step to roll back to.
    """
    logging.info(f"Rolling back metadata for {pdf_name} to step '{step}'")
    metadata = read_metadata(pdf_name)

    # Get progress level for the rollback step
    rollback_level = PROGRESS_LEVELS.get(step)
    if rollback_level is None:
        raise ValueError(f"Unknown step: {step}")
    
    logging.debug(f"Rolling back metadata for {pdf_name} to step '{step}' (level {rollback_level})")

    # Update progress
    metadata["progress"] = rollback_level-1 if metadata["progress"] >= rollback_level else metadata["progress"]

    # Remove metadata for steps beyond rollback point
    metadata["steps"] = {
        s: data for s, data in metadata.get("steps", {}).items()
        if PROGRESS_LEVELS.get(s, 0) < rollback_level
    }

    metadata["last_modified"] = datetime.now().isoformat()
    _write_metadata(pdf_name, metadata)
