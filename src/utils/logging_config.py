import logging
import os
from datetime import datetime

def setup_logger(debug=False):
    """
    Sets up the root logger to log messages to both a file and the console.
    
    Parameters:
    - debug (bool): If True, sets logging level to DEBUG. Otherwise, INFO.
    """
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG if debug else logging.INFO)  # Set log level

    if not logger.hasHandlers():  # Avoid duplicate handlers
        os.makedirs("logs", exist_ok=True)
        os.makedirs("logs/debug", exist_ok=True)

        # Generate a unique log filename with timestamp
        log_file = f"logs/{'debug/' if debug else ''}pipeline_{datetime.now().strftime('%Y_%m_%d_%H_%M_%S')}.log"

        # Create file handler for logging to file (DEBUG level)
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)

        # Create console handler for logging to console (INFO level)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # Define a standard log format with timestamps and severity levels
        formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(message)s", "%Y-%m-%d %H:%M:%S"
        )

        # Apply the formatter to both handlers
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        # Add handlers to the logger
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
