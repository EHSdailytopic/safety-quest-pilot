# Safety Quest — Interactive Pilot v2

This version intentionally minimizes multiple-choice questions.

## Pilot game mechanics
- Level 1: Spot Hazard, Drag / Classify
- Level 2: Sequence, Matching
- Level 3: Branching Scenario, Timed Inspection

## Demo Mode
The repository includes `questions.demo.json` with local demo answer keys so the UI can be tested without Power Automate.

IMPORTANT: demo answer keys are public if this repository is public. They are only for UI testing.
Production must get questions from Power Automate and must NOT return Correct_Answer.

## Upload to an existing GitHub Pages repo
Replace / upload these files in the repository root:
- index.html
- style.css
- app.js
- questions.demo.json
- README.md

GitHub Pages can remain configured as:
- Branch: main
- Folder: /(root)

## Production Flow 1 response
For interactive questions, return at minimum:
- questionId
- topic
- topicTitle
- level
- questionType
- question
- instruction
- gameConfig

Do NOT return `Correct_Answer`.

## Flow 2 request
The frontend still sends one normalized `answer` string:
- SpotHazard: `Z2`
- DragClassify: `SAFE:S1,S3,S5|UNSAFE:S2,S4,S6`
- Sequence: `S1|S2|S3|S4|S5`
- Matching: `M1-F1|M2-F2|M3-F3|M4-F4`
- Branching: `B|A|C`
- TimedInspection: `Z1|Z3|Z4`

Power Automate can keep equality-based checking after trim / uppercase normalization.
