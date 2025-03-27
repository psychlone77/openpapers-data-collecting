# openpapers-data-collecting

This repository is part of the OpenPapers project and is responsible for collecting and processing data. It includes scripts and tools for handling raw data, transforming it into structured formats, and preparing it for further analysis or storage.

## Folder Structure

- **`data/`**: Contains subfolders for organizing data files.
    - **`raw/`**: For storing raw files before processing
    - **`primary/`**: ...
    - **`intermediate/`**: Folder to be used for any intermediate steps

- **`gemini/`**: Folder to be used to work on extracting and creating the json using the `Gemini` API

- **`layout-parser/`**: Folder to work on layout segregation of papers. Useful for extracting images and seperating code blocks.

This structure ensures a clear separation of concerns, making it easier to manage and extend the project.