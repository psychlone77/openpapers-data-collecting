import os
import cv2
import supervision as sv
import logging
from ultralytics import YOLO
from pathlib import Path

from utils.decorators import log_exceptions

logger = logging.getLogger(__name__)

@log_exceptions
def _detect_and_crop_objects(model_path: str, input_dir: str, output_dir: str):

    """
    Loads a YOLO model, detects objects in images, crops them based on bounding boxes, and saves the crops.
    
    Args:
        model_path (str): Path to the YOLO model file
        input_dir (str): Directory containing input images
        output_dir (str): Directory to save cropped images
    """
    # Load the model
    try:
        model = YOLO(model_path)
    except FileNotFoundError as e:
        logger.error(f"Model file 'best.pt' not found at {model_path}. Please ensure the model is available.\n")
        # e._already_logged = True
        raise e
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    images_found = False
    
    # Process each image in the input directory
    for image_file in os.listdir(input_dir):
        logger.info(f"Processing file: {image_file}")
        if image_file.endswith(('.jpg', '.jpeg', '.png')):
            # Load the image
            image_path = os.path.join(input_dir, image_file)
            image = cv2.imread(image_path)
            
            # Skip if image couldn't be loaded
            if image is None:
                logger.warning(f"Could not load image: {image_path}")
                continue
                
            # Run inference and get detections
            results = model(image, verbose=False)[0]
            detections = sv.Detections.from_ultralytics(results).with_nms()
            
            # Create a directory for this image's crops
            base_filename = os.path.splitext(image_file)[0]
            image_output_dir = os.path.join(output_dir, base_filename)
            os.makedirs(image_output_dir, exist_ok=True)
            
            # Process each detection
            if len(detections) > 0:
                # Get bounding boxes
                boxes = detections.xyxy  # [x1, y1, x2, y2] format
                
                # Get class IDs if available
                class_ids = detections.class_id if hasattr(detections, 'class_id') else [None] * len(boxes)
                
                # Crop and save each detection
                for i, (box, class_id) in enumerate(zip(boxes, class_ids)):
                    x1, y1, x2, y2 = map(int, box)  # Convert to integers
                    
                    # Ensure coordinates are within image boundaries
                    x1, y1 = max(0, x1), max(0, y1)
                    x2 = min(image.shape[1], x2)
                    y2 = min(image.shape[0], y2)
                    
                    # Crop the image
                    cropped_image = image[y1:y2, x1:x2]
                    
                    # Skip if crop is empty
                    if cropped_image.size == 0:
                        continue
                    
                    # Create filename with class info if available
                    class_info = f"_class{class_id}" if class_id is not None else ""
                    crop_filename = f"{base_filename}_crop{i}{class_info}.jpg"
                    crop_path = os.path.join(image_output_dir, crop_filename)
                    
                    # Save the cropped image
                    cv2.imwrite(crop_path, cropped_image)
                
                logger.info(f"Processed {len(boxes)} detections from {image_file}")
                images_found = True
            else:
                logger.info(f"No detections found in {image_file}")

    logger.warning(f"No images found for {output_dir.replace('\\', '/').split("/")[-3]} in {output_dir.replace('\\', '/').split("/")[-2]} section") if not images_found else None
    
    logger.debug(f"Write | Images | {output_dir.replace('\\', '/')}")

@log_exceptions
def extract_images(input_dir: str, output_dir: str):
    """
    Extracts images by running object detection and cropping on MCQ, structured, and essay page images.
    """

    logger.info(f"Extracting images from {input_dir.split("/")[-1]}")
    logger.debug(f"Read | Pages | {input_dir}")
    
    subdirs = ['mcq', 'structured', 'essay']
    
    model_path = Path(__file__).parent/'best.pt'

    for subdir in subdirs:
        in_path = os.path.join(input_dir, subdir)
        out_path = os.path.join(output_dir, subdir)
        out_path = os.path.join(out_path, "images")
        os.makedirs(out_path, exist_ok=True)
        # Run detection and cropping
        _detect_and_crop_objects(model_path, in_path, out_path)
