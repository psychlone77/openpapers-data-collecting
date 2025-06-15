import logging
from functools import wraps

try:
    from utils.logging_config import setup_logger
except:
    from logging_config import setup_logger

logger = logging.getLogger(__name__)

def log_exceptions(func):
    """
    A decorator that wraps a function to catch and log any unhandled exceptions.

    If the exception hasn't already been logged (checked via a custom _already_logged attribute),
    it logs the exception using the module-level logger.

    Parameters:
    - func (function): The function to wrap with exception logging.

    Returns:
    - function: A wrapped version of the input function that logs exceptions.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            # Call the original function
            return func(*args, **kwargs)
        except Exception as e:
            # Check if the exception was already logged
            if not getattr(e, "_already_logged", False):
                logger.exception(f"Unhandled exception in '{func.__name__}': {e}")
            raise
    return wrapper
