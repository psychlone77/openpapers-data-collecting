# OpenPapers Data Collecting Working Repository

This repository is part of the OpenPapers project and is responsible for collecting and processing data. It includes scripts and tools for handling raw data, transforming it into structured formats, and preparing it for further analysis or storage.

## Naming Conventions
- Papers should be named using the following scheme.
    - `<Year>-<Exam>-<Subject>-<ExamType>-<Medium>`
    - eg: `2019-AL-Physics-MCQ-English.pdf`

## Folder Structure

- **`data/`**: Contains subfolders for organizing data files.
    - **`raw/`**: For storing raw files before processing
    - **`primary/`**: ...
    - **`intermediate/`**: Folder to be used for any intermediate steps

- **`gemini/`**: Folder to be used to work on extracting and creating the json using the `Gemini` API
  - *When working on this folder use the `gemini` branch*

- **`layout-parser/`**: Folder to work on layout segregation of papers. Useful for extracting images and seperating code blocks.
  - *When working on this folder use the `layout-parser` branch*

This structure ensures a clear separation of concerns, making it easier to manage and extend the project.
