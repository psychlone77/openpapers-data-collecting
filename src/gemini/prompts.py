mcq_prompt = """
    This is an MCQ paper, i want you to extract the text from the questions and answers and fill out a json as instructed below. each question have 5 answers. some questions have images in their questions or answers. in a case like that, images with names will be provided, use the image_name where the image should be in brackets [], otherwise leave the question_image empty. same for question images. For help in choosing the correct image, not that some images may have a question number, probably within brackets, this could hint at where that image should fit. And in the paper, if an image is not obviously affiliated with a number, there is a good chance of it being only a question image. Some questions may have only images for questions or answers, in that case fill the image section as usual, but leave the text part empty. The json as required is below:
        interface Question {
            question_number: number;
            question_text: string;
            subject_unit: string | null;
            options: Option[] | null;
            answer: string | null;
            question_images: string[];
            marks: number;
            difficulty: Difficulty;
        }
        interface Option {
            option_text: string;
            option_image: string;
            is_correct: boolean;
        }
    For subject_unit, answer, marks from Question, leave leave them empty. Same for is_correct from Option. Use 'normal' as default value for all 'difficulty' in Question.
    Also, instead of giving separate jsons for questions and answers, have answer json nested inside question json.
    RETURN ONLY THE JSON STRING IN A HUMAN READABLE FORMAT
    Return the result as raw JSON, do not wrap it in markdown or code blocks.
    make sure all text elements are in latex code
    Always, use the given questions. Do not make up questions and answers.
    Make sure the outputs are in the expected data type to not cause errors. For an example, the text for both questions and answers must be a string, even if the data is a number, return it as a string for a case like that.

    an example is provided for further context:
    [
        { # an example where the question has text and images, but the answers are only text
            "question_number": 1,
            "question_text": "What is the acceleration due to gravity on Earth?",
            "subject_unit": "[]",
            "options": [
            {
                "option_text": "9.8 m/s²",
                "option_image": "[]",
                "is_correct": "[]"
            },
            {
                "option_text": "10 m/s²",
                "option_image": "[]",
                "is_correct": "[]"
            },
            {
                "option_text": "8.9 m/s²",
                "option_image": "[]",
                "is_correct": "[]"
            },
            {
                "option_text": "11 m/s²",
                "option_image": "[]",
                "is_correct": "[]"
            },
            {
                "option_text": "9.0 m/s²",
                "option_image": "[]",
                "is_correct": "[]"
            }
            ],
            "answer": "[]",
            "question_images": "page_1_crop2_class0.jpg",
            "marks": "[]",
            "difficulty": "normal"
        },
        { # an example where the question has only text, but the answers have only images
            "question_number": 2,
            "question_text": "Identify the diagram that best represents Ohm's Law.",
            "subject_unit": "[]",
            "options": [
            {
                "option_text": "[]",
                "option_image": "page_2_crop1_class0.jpg",
                "is_correct": "[]"
            },
            {
                "option_text": "[]",
                "option_image": "page_2_crop2_class0.jpg",
                "is_correct": "[]"
            },
            {
                "option_text": "[]",
                "option_image": "page_2_crop3_class0.jpg",
                "is_correct": "[]"
            },
            {
                "option_text": "[]",
                "option_image": "page_2_crop4_class0.jpg",
                "is_correct": "[]"
            },
            {
                "option_text": "[]",
                "option_image": "page_2_crop5_class0.jpg",
                "is_correct": "[]"
            }
            ],
            "answer": "[]",
            "question_images": [],
            "marks": "[]",
            "difficulty": "normal"
        }
    ]
"""

structured_prompt = """
    This is a structured question paper. Extract the text from the questions, and fill out a JSON as instructed below. Some questions may have images; in such cases, image names will be provided, use the image name in brackets [] where the image should be. If the question is just an image without text, fill the image section as usual, but leave the text section empty. Questions may have subsections, for that follow the structure and fill out as necessary. The JSON format is as follows:
        interface StructuredQuestion {
            question_number: number;
            question_text: string;
            subject_unit: string | null;
            answer: string | null;
            question_images: string[];
            marks: number;
            difficulty: Difficulty;
            sub_questions: StructuredQuestion[] | null;
        }
    For subject_unit, answer, marks, use placeholders like '[subject_unit]', '[answer]', '[marks]' if not available. Use 'normal' as default for 'difficulty'. 
    Return only the JSON string, do not wrap it in markdown or code blocks.
    Make sure all text elements are in latex code.
    Always, use the given questions. Do not make up questions and answers.

    Example:
    [
        {
            "question_number": 1,
            "question_text": "Explain the process of photosynthesis.",
            "subject_unit": "[subject_unit]",
            "answer": "[answer]",
            "question_images": ["[question_images]"],
            "marks": "[marks]",
            "difficulty": "normal"
            "sub_questions": [
                {
                    "question_number": 1,
                    "question_text": "What are the main components involved in photosynthesis?",
                    "subject_unit": "[subject_unit]",
                    "answer": "[answer]",
                    "question_images": ["[question_images]"],
                    "marks": "[marks]",
                    "difficulty": "normal",
                    "sub_questions": null
                },
                {
                    "question_number": 2,
                    "question_text": "Describe the role of chlorophyll in photosynthesis.",
                    "subject_unit": "[subject_unit]",
                    "answer": "[answer]",
                    "question_images": ["[question_images]"],
                    "marks": "[marks]",
                    "difficulty": "normal",
                    "sub_questions": null
                }
            ]
        }
    ]
"""

essay_prompt = """
    This is an essay question paper. Extract the text from each essay question and fill out a JSON as instructed below. Some questions may have images; in such cases, image names will be provided, use the image name in brackets [] where the image should be. If the question is just an image without text, fill the image section as usual, but leave the text section empty. Questions may have subsections, for that follow the structure and fill out as necessary. The JSON format is as follows:
        interface EssayQuestion {
            question_number: number;
            question_text: string;
            subject_unit: string | null;
            answer: string | null;
            question_images: string[];
            marks: number;
            difficulty: Difficulty;
            sub_questions: EssayQuestion[] | null;
        }
    For subject_unit, answer, marks, use placeholders like '[subject_unit]', '[marks]' if not available. Use 'normal' as default for 'difficulty'.
    Return only the JSON string, do not wrap it in markdown or code blocks.
    Make sure all text elements are in latex code.
    Always, use the given questions. Do not make up questions and answers.

    Example:
    [
        {
            "question_number": 1,
            "question_text": "Discuss the impact of climate change on agriculture.",
            "subject_unit": "[subject_unit]",
            "question_images": ["[question_images]"],
            "marks": "[marks]",
            "difficulty": "normal"
            "answer": "[answer]",
            "sub_questions": [
                {
                    "question_number": 1,
                    "question_text": "What are the main factors contributing to climate change?",
                    "subject_unit": "[subject_unit]",
                    "answer": "[answer]",
                    "question_images": ["[question_images]"],
                    "marks": "[marks]",
                    "difficulty": "normal",
                    "sub_questions": null
                },
                {
                    "question_number": 2,
                    "question_text": "How can farmers adapt to changing climatic conditions?",
                    "subject_unit": "[subject_unit]",
                    "answer": "[answer]",
                    "question_images": ["[question_images]"],
                    "marks": "[marks]",
                    "difficulty": "normal",
                    "sub_questions": null
                }
            ]
        }
    ]
"""