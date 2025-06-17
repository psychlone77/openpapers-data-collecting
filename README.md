# OpenPapers Data Collecting Working Repository

This repository is part of the OpenPapers project and is responsible for collecting and processing data. It includes scripts and tools for handling raw data, transforming it into structured formats, and preparing it for further analysis or storage.

## Naming Conventions
- Papers should be named using the following scheme.
    `<Year>-<Exam>-<Subject>-<ExamType>-<Medium>`
    eg:
    > `2019-AL-Physics-MCQ-English.pdf`
    > `2016-AL-Chemistry-All-Sinhala.pdf`

## Data Structure
The data in the process of conversion can be found in separate layers in the `./data` folder
- **Bronze**: The papers in raw PDF format, named according to the scheme.
- **Silver**: The papers split to pages, each page saved as an image, in a folder suitable to the question type, as `mcq`, `structured`, `essay` or `other`
- **Gold**: Includes the diagrams and jsons extracted from the PDFs.
- **Primary**: Includes the final version of the data, a list of jsons with images in base64 format.
- **Metadata**: Contains metadata regarding levels of PDF processes.

## Using the pipeline
To convert the PDF files to json for each question, the `pdf_to_json_pipeline.py` can be used. It can be called as below
> `python src\pdf_to_json_pipeline.py`

This will run the pipeline to convert the PDFs to json. The managed metadata will be used to recognize the level processed for available PDFs, and the it will be continued accordingly.
And a log consisting the process details will be saved to `./logs`.
By running the pipeline with `--debug` tag at the end of the previous command will run the pipeline in debug mode, and logs with debug details will be saved to `./logs/debug`

## Metadata
A json file will be created for each paper in `./data/metadata` directory. Following a self explanatory structure with details of the steps run, and source and target paths, and details about last runtime. This is mainly used by the pipeline to keep track of how much the PDFs have been processed.

## Cleaning
To clean the `./data` directory, `clean_utils.py` can be used. This can be called as below
> `python src\utils\clean_utils.py {pdf-name} --level {level-of-cleaning}`

This can also be run with `--debug` tag at the end to run in debug mode.

For the {pdf-name} use the PDF name as mentioned above. Or use `all` to clean for all PDFs.

For the {level-of-cleaning} the process level can be used. Options: ["bronze", "silver", "gold_images", "gold_questions", "primary]. When a level is specified, all the layers above will also be cleaned. And the metadata will be changed accordingly.

## Scripts
The main script `./src/pdf_to_jon_pipeline.py` is used to orchestrate the pipeline. This calls 3 other files for the 3 steps of the pipeline.
- `./src/pdf/split_to_pages.py` : Used to separate the PDF into pages, preprocess them for clarification, and organize them by question type.
- `./src/images/image_extract.py` : Used to extract the diagrams from the pages. This is done using a YOLO model, which is included in the same directory.
- `./src/gemini/convert_to_json.py` : Used to extract the questions into json from the pages, and connect them with relevant images extracted in the previous step. This is done using gemini API.
- `./src/questions/cleaned_json.py` : Used for final cleaning. The jsons are combined into one list of jsons. Where the images are used in place instead of references, in base64 format.

`./src/utils/` contains the utilities for the pipeline.
- `./src/utils/logging_config.py` : Used for logging the details of pipeline run. The logs will include timestamp, the level of log and self explanatory messages.
- `./src/utils/decorators.py` : Contains decorators for functions, currently contains one decorator for error handling.
- `./src/utils/metadata.py` : Used for handling metadata of the PDFs processed as mentioned previously.
- `./src/utils/clean_utils.py` : Used to clean the `./data` folder as mentioned above.