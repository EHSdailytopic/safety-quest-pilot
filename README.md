# Safety Quest Multi-type Pilot

## What this starter tests
One topic (Forklift Safety) with multiple question types:
MCQ, True/False, Image Choice, Scenario, Multi Select, Sequence, Matching, Spot Hazard, Puzzle.

## Quick UI test
1. Upload all files to a GitHub repository.
2. Settings -> Pages -> Deploy from branch -> main / root.
3. Open the GitHub Pages URL.
4. Keep **Demo Mode** checked.
5. Choose Level and click START.
6. Use Previous/Next type to inspect the different renderers.

## Connect Power Automate
Turn Demo Mode off, then paste:
- Flow 1: Get Question URL
- Flow 2: Submit Answer URL

Flow 1 response should include:
questionId, topic, topicTitle, level, questionType, question, instruction,
optionA, optionB, optionC, optionD, gameConfig.

`gameConfig` may be a JSON object or a JSON string.

Flow 2 continues to receive one `answer` string.
Encoding:
- MCQ / TrueFalse / Scenario / ImageChoice: `A`
- MultiSelect: `A|B`
- Sequence: `S1|S2|S3|S4`
- Matching: `H1-C1|H2-C2|H3-C3`
- SpotHazard: `Z2`
- Puzzle: uppercase trimmed text, e.g. `E`

IMPORTANT:
Do not return Correct_Answer from Flow 1.
Do not store Correct_Answer inside Game_Config.
Power Automate / SharePoint remains the source of truth.
