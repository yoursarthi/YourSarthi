import { useState, useRef } from 'react';

// ── Course Data ──────────────────────────────────────────────────────────────
const COURSE = {
  id: 'ai-nonprog-v1',
  title: 'AI for Non‑Programmers',
  subtitle: '4-Week Certificate Course · 100% Online · No Coding Required',
  instructor: 'University Management System',
  level: 'Beginner',
  totalDays: 20,
  hoursPerDay: 2,
  enrolled: 1247,
  rating: 4.8,
  description: 'Master Artificial Intelligence concepts without writing a single line of code. From understanding what AI is to building your own no-code models, through prompt engineering and AI ethics.',
  topics: ['AI History & Fundamentals','ML vs DL vs Generative AI','Supervised & Unsupervised Learning','Reinforcement Learning','NLP & Chatbots','Computer Vision','Generative AI & Prompting','AI Ethics & Deepfakes','No-Code AI Tools','AI in Industry'],
  assessment: [
    { label: 'Weekly Quizzes', detail: '4 quizzes · 20 MCQs each · −0.25 negative marking · 80 total marks' },
    { label: 'Final Exam',    detail: '50 MCQs · 2 marks each · −0.5 negative marking · 100 total marks' },
    { label: 'Pass Criteria', detail: '≥ 72 / 180 overall AND ≥ 30 / 100 in Final Exam' },
    { label: 'Award',         detail: 'Certificate in AI for Non‑Programmers' },
  ],
  weeks: [
    {
      num: 1, title: 'What is AI?', color: '#6366f1',
      days: [
        {
          num: 1, title: 'Introduction to AI & History', duration: '120 min',
          outcomes: ['Define Artificial Intelligence in simple terms','Identify key milestones in AI history','Spot AI in your daily routine'],
          keyPoints: [
            'AI is a collection of techniques that make machines mimic human intelligence — understanding language, recognising images, making decisions, and learning.',
            'The Turing Test (1950): if a judge cannot tell which chat partner is a machine, the machine passes.',
            'AI is not a single technology — it encompasses many approaches from rule-based systems to modern neural networks.',
            'AI is already around you: navigation apps, recommendation engines, face unlock, spam filters, smart keyboards.',
          ],
          table: { headers: ['Year','Milestone','Why it matters'], rows: [
            ['1956','Dartmouth Conference — term "AI" coined','Official birth of AI as a field'],
            ['1966','ELIZA — first chatbot','Early natural language processing'],
            ['1997','IBM Deep Blue defeats Kasparov','First computer to beat a world chess champion'],
            ['2011','IBM Watson wins Jeopardy!','AI understands complex natural language questions'],
            ['2016','AlphaGo beats Lee Sedol','AI masters intuition-based game strategy'],
            ['2020','GPT-3 released by OpenAI','Large language models generate human-like text'],
            ['2022','ChatGPT & DALL-E 2 go public','Generative AI becomes mainstream'],
          ]},
          videos: [
            { title: '"What is AI?" by Simplilearn', query: 'What is Artificial Intelligence AI In 5 Minutes Simplilearn', duration: '5 min' },
            { title: '"History of AI" by CrashCourse', query: 'Crash Course Artificial Intelligence Episode 1', duration: '12 min' },
          ],
          activity: { name: 'My AI Diary', steps: [
            'Open a blank document or notebook.',
            'List every app, device, or service you used today that might contain AI.',
            'Next to each, guess what the AI does.',
            'Examples: Facebook (face recognition), Amazon (recommendations), Phone keyboard (predictive text).',
          ]},
          selfCheck: [
            { q: 'What year was the term "Artificial Intelligence" coined?', options: ['1945','1956','1969','1984'], correct: 1 },
            { q: "Why was AlphaGo's victory over Lee Sedol significant?", options: ['First computer to play a board game','Go requires intuition — AI showed it can master a game thought uniquely human','AlphaGo was the fastest computer then','It proved AI beats humans at everything'], correct: 1 },
            { q: 'Which is NOT an AI-powered feature?', options: ['Netflix movie recommendations','Google Maps traffic prediction','A regular mechanical alarm clock','Instagram face filters'], correct: 2 },
          ],
        },
        {
          num: 2, title: 'AI vs ML vs DL vs Generative AI', duration: '120 min',
          outcomes: ['Distinguish between AI, ML, DL, and Generative AI','Understand the nested relationship among these terms','Give a real-world example of each'],
          keyPoints: [
            'AI is the broadest term — any technique that makes machines mimic human intelligence.',
            'Machine Learning (ML) ⊂ AI: algorithms that learn patterns from data instead of following explicit rules.',
            'Deep Learning (DL) ⊂ ML: multi-layer neural networks loosely inspired by the brain.',
            'Generative AI ⊂ DL: creates new content — text, images, music, code — rather than just classifying.',
            'Memory aid: AI ⊃ ML ⊃ DL ⊃ Generative AI. Each is a specialisation of the one above it.',
          ],
          table: { headers: ['Term','Example system','Why it fits'], rows: [
            ['AI (rule-based)','Chess with pre-programmed strategies','No learning from data'],
            ['ML','Netflix recommendation engine','Learns your taste from watch history'],
            ['DL','Face ID on iPhone','Neural net learns face features from millions of images'],
            ['Generative AI','Midjourney from a text prompt','Generates a new image that never existed'],
          ]},
          videos: [
            { title: '"AI vs ML vs DL" by edureka!', query: 'AI vs Machine Learning vs Deep Learning edureka', duration: '10 min' },
            { title: '"What is Generative AI?" by Google Cloud', query: 'What is Generative AI Google Cloud Tech', duration: '6 min' },
          ],
          activity: { name: 'Categorise the AI', steps: [
            'A thermostat that learns your schedule (Nest) → classify as Rule-based AI, ML, DL, or Generative AI.',
            'A customer service chatbot that only responds with menu options → classify.',
            "Google Photos recognising your friend's face → classify.",
            'A tool that creates a new logo based on keywords → classify.',
            'Answers: Nest = ML · Menu chatbot = Rule-based · Google Photos = DL · Logo tool = Generative AI.',
          ]},
          selfCheck: [
            { q: 'True or False: All Machine Learning is Deep Learning.', options: ['True','False'], correct: 1 },
            { q: 'Which subset of AI is responsible for creating deepfake videos?', options: ['Rule-based AI','Simple ML','Generative AI / Deep Learning','Reinforcement Learning'], correct: 2 },
            { q: "Netflix recommending shows based on your history is an example of:", options: ['Rule-based AI','Machine Learning','Pure mathematics','Manual curation'], correct: 1 },
          ],
        },
        {
          num: 3, title: 'AI in Daily Life', duration: '120 min',
          outcomes: ['Identify at least 10 everyday applications of AI','Explain how recommendation systems work','Describe how voice assistants process commands'],
          keyPoints: [
            'AI curates your morning: smart alarms, news feeds, traffic predictions, spam filters, and ad targeting all use ML.',
            'Recommendation systems: content-based (similar items) + collaborative filtering ("people who liked X also liked Y"). Netflix uses both.',
            'Voice assistant pipeline: Wake Word → ASR (speech-to-text) → NLU (intent) → Response → TTS (text-to-speech).',
            'Social media algorithms use engagement patterns + computer vision to decide what you see.',
            'Banks use ML to flag unusual transactions vs. your historical spending patterns (fraud detection).',
          ],
          videos: [
            { title: '"How AI Works in Everyday Life" — Google Cloud', query: 'How AI Works in Everyday Life Google Cloud', duration: '6 min' },
            { title: '"How Netflix Recommends Movies" — Vox', query: 'How Netflix recommends movies Vox', duration: '5 min' },
          ],
          activity: { name: 'Audit Your Digital Day', steps: [
            'From waking up until now, write down every digital interaction.',
            'Next to each, note the AI technique likely used: recommendation, NLP/speech, computer vision, prediction, or fraud detection.',
            'Aim for at least 10 entries.',
          ]},
          selfCheck: [
            { q: '"Customers who bought this also bought…" uses which filtering?', options: ['Content-based filtering','Collaborative filtering','Rule-based filtering','Random selection'], correct: 1 },
            { q: 'What is the correct order for a voice assistant after the wake word?', options: ['NLU → ASR → Response','ASR → NLU → Response Generation','Response → ASR → NLU','TTS → ASR → NLU'], correct: 1 },
            { q: 'How does a fraud detection system know a transaction is unusual?', options: ['It checks government blacklists','It learns your normal spending patterns from past data','It requires manual review','It blocks all foreign transactions'], correct: 1 },
          ],
        },
        {
          num: 4, title: 'Data: The Fuel of AI', duration: '120 min',
          outcomes: ['Define data and its three types','Explain the GIGO principle','Describe the 6-step data-to-AI pipeline'],
          keyPoints: [
            'Structured: rows/columns (Excel, SQL). Unstructured: free-form (emails, images, video). Semi-structured: partial organisation (JSON, XML). ~80–90% of real data is unstructured.',
            '"Garbage In, Garbage Out" (GIGO): biased or poor-quality data produces flawed AI models.',
            '6-step pipeline: (1) Collect → (2) Clean → (3) Label → (4) Feature extraction → (5) Train → (6) Evaluate.',
            'Common issues: bias (unrepresentative sample), noise (errors), data drift (world changes, model doesn\'t).',
          ],
          table: { headers: ['Type','Description','Examples'], rows: [
            ['Structured','Organised in rows/columns','Excel sheets, SQL databases'],
            ['Unstructured','No predefined format','Emails, videos, social media posts'],
            ['Semi-structured','Some organisation','JSON, XML, web server logs'],
          ]},
          videos: [
            { title: '"Data is the New Oil" — WEF', query: 'Data is the new oil World Economic Forum', duration: '2 min' },
            { title: '"Intro to Data for ML" — Khan Academy', query: 'Introduction Data Machine Learning Khan Academy', duration: '10 min' },
          ],
          activity: { name: 'Create a Mini Dataset', steps: [
            'Open a spreadsheet. Columns: Item, Colour, Size, Label.',
            'Fill 20 rows for fruits and vegetables.',
            'Question: if you only included red fruits, would the model correctly predict a lemon? (No — this is bias.)',
            'You just performed data collection and labeling — the first two pipeline steps!',
          ]},
          selfCheck: [
            { q: 'What is the key difference between structured and unstructured data?', options: ['Structured has more bytes','Structured has a defined schema; unstructured is free-form','Unstructured is always text','Structured data is always numerical'], correct: 1 },
            { q: 'What does GIGO stand for?', options: ['Gather, Integrate, Generate, Output','Garbage In, Garbage Out','General Intelligence, General Output','Graphics In, Graphics Out'], correct: 1 },
            { q: 'In Google Teachable Machine, who provides the training labels?', options: ['Google automatically labels them','A third-party data company','You, the user','The neural network itself'], correct: 2 },
          ],
        },
        {
          num: 5, title: 'No‑Code AI Playground: Teachable Machine', duration: '120 min',
          outcomes: ['Build an image classifier without writing code','Understand training, testing, and confidence scores','Reflect on why diverse training data matters'],
          keyPoints: [
            'Google Teachable Machine trains deep learning models (image, audio, pose) directly in your browser via TensorFlow.js — zero coding needed.',
            'Key terms: Class (category label), Training (showing examples), Confidence Score (% certainty of the prediction).',
            'More diverse training examples → better generalisation to unseen images.',
            'URL: teachablemachine.withgoogle.com',
          ],
          videos: [
            { title: '"Teachable Machine Tutorial" — The Coding Train', query: 'Teachable Machine Tutorial Coding Train', duration: '10 min' },
          ],
          activity: { name: 'Build Your First AI Model', steps: [
            'Go to teachablemachine.withgoogle.com → "Image Project" → "Standard image model".',
            'Create two classes (e.g., "Thumbs Up" vs "Thumbs Down").',
            'Use webcam or upload ≥ 50 images per class with variety.',
            'Click "Train Model" and wait.',
            'Test with new angles and unrelated objects. Observe the confidence scores.',
            'If the model makes mistakes, add more training examples and retrain.',
          ]},
          selfCheck: [
            { q: 'What does Teachable Machine output alongside the predicted class?', options: ['Training time','A confidence score (probability)','The pixel count','Layer architecture'], correct: 1 },
            { q: 'Your model misclassifies images taken from far away. Best fix?', options: ['Buy a better camera','Add more training images taken from that distance','Delete and restart','Reduce number of classes'], correct: 1 },
            { q: 'True or False: You need to write code to use Teachable Machine.', options: ['True','False'], correct: 1 },
          ],
        },
      ],
    },
    {
      num: 2, title: 'How Machines Learn', color: '#0d9488',
      days: [
        {
          num: 6, title: 'Supervised Learning', duration: '120 min',
          outcomes: ['Define supervised learning','Differentiate regression and classification','Identify features and labels'],
          keyPoints: [
            'Supervised learning trains on labeled data (data where correct answers are already known) — most common ML type.',
            'Classification: discrete output (spam/not-spam, cat/dog). Regression: continuous number (house price, temperature tomorrow).',
            'Features = inputs. Label = output. The model minimises prediction error (gradient descent).',
            'Overfitting: memorises training noise → fails on new data. Underfitting: too simple → misses patterns.',
          ],
          table: { headers: ['Type','Question answered','Output','Example'], rows: [
            ['Classification','"Which category?"','Discrete class','Spam / not-spam email'],
            ['Regression','"How much?"','Continuous number','House price prediction'],
          ]},
          videos: [
            { title: '"Supervised vs Unsupervised vs RL" — StatQuest', query: 'Supervised Unsupervised Reinforcement Learning StatQuest', duration: '8 min' },
            { title: '"What is Supervised Learning?" — Google Cloud', query: 'What is Supervised Learning Google Cloud Tech', duration: '4 min' },
          ],
          activity: { name: 'Label Features and Labels', steps: [
            'Loan default prediction: features = income, credit score, loan amount; label = Default (Yes/No) → Classification.',
            'Apartment rent: features = area, location, rooms; label = monthly rent ($) → Regression.',
            'Create your own scenario: choose a problem, list features and label, identify type.',
          ]},
          selfCheck: [
            { q: 'Main difference between classification and regression?', options: ['Classification uses more data','Classification output is discrete; regression output is continuous','Regression is always more accurate','Classification never needs labels'], correct: 1 },
            { q: "Predicting tomorrow's temperature is:", options: ['Classification','Regression','Unsupervised learning','Reinforcement learning'], correct: 1 },
            { q: 'Why is overfitting a problem?', options: ['Makes training slower','Performs well on training data but fails on new data','Uses too much electricity','Model becomes too simple'], correct: 1 },
          ],
        },
        {
          num: 7, title: 'Unsupervised Learning', duration: '120 min',
          outcomes: ['Define unsupervised learning','Explain clustering and association rule mining','Give real-world use cases'],
          keyPoints: [
            'Unsupervised learning works with unlabeled data — it finds hidden patterns on its own.',
            'Clustering (e.g., K-means): groups similar data points. Used for customer segmentation, document grouping, image compression.',
            'Association mining: "people who buy bread also buy butter" — market basket analysis.',
            'Anomaly detection: identifies outliers — used for fraud and manufacturing defects.',
          ],
          videos: [
            { title: '"Unsupervised Learning Explained" — StatQuest', query: 'Unsupervised Learning explained StatQuest', duration: '8 min' },
            { title: '"Market Basket Analysis" — 365 Data Science', query: 'Market Basket Analysis 365 Data Science', duration: '5 min' },
          ],
          activity: { name: 'Manual Clustering Exercise', steps: [
            'Create a table of 10 fictional friends: Age, Annual Income, Favourite Hobby.',
            'Without a computer, group them into 3 clusters manually.',
            'Give each cluster a descriptive name.',
            "That's the intuition behind K-means clustering!",
          ]},
          selfCheck: [
            { q: 'Why might a retailer use clustering on customer data?', options: ['To delete duplicates','To segment customers for personalised marketing','To comply with data protection laws','To reduce product catalogue'], correct: 1 },
            { q: 'Which is an example of an association rule?', options: ['"Customers who buy eggs also buy milk"','"Customers 25–34 spend more"','"This customer will default"','"This email is spam"'], correct: 0 },
            { q: 'Does K-means require labeled training data?', options: ['Yes, it needs class labels','No, it works with unlabeled data','Only for numerical data','Only for images'], correct: 1 },
          ],
        },
        {
          num: 8, title: 'Reinforcement Learning', duration: '120 min',
          outcomes: ['Define RL and its core components','Contrast RL with other learning types','Recognise real-world RL applications'],
          keyPoints: [
            'An agent learns by interacting with an environment and receiving rewards (+) or penalties (−). Goal: maximise cumulative reward.',
            'Components: Agent, Environment, State, Action, Reward, Policy (strategy mapping states → best actions).',
            'Famous examples: AlphaGo, self-driving car simulators, robotic arms.',
            'Exploration vs. Exploitation: try new actions to find better rewards vs. exploit what currently works.',
            'Analogy: training a pet — reward desired behaviour, penalise undesired.',
          ],
          table: { headers: ['Element','Description','Dog-training analogy'], rows: [
            ['Agent','The learner/decision-maker','The dog'],
            ['Environment','The world it operates in','Your home'],
            ['State','Current situation','Dog is sitting'],
            ['Action','Move the agent can make','Sit, lie down, roll over'],
            ['Reward','Feedback signal','Treat or scolding'],
            ['Policy','State → best action strategy','Trained behaviour'],
          ]},
          videos: [
            { title: '"Reinforcement Learning" — CrashCourse AI #9', query: 'Reinforcement Learning Crash Course AI 9', duration: '12 min' },
            { title: '"AI Learns to Park" — AI Warehouse', query: 'AI Learns to Park AI Warehouse', duration: '4 min' },
          ],
          activity: { name: 'RL in Real Life', steps: [
            'Think of a skill you learned by trial and error (riding a bike, cooking, a sport).',
            'Identify: Environment? Actions? Rewards (success)? Penalties (failure)?',
            'Map your experience to the RL framework.',
            'Reflection: your brain was performing reinforcement learning!',
          ]},
          selfCheck: [
            { q: 'Main feedback signal in Reinforcement Learning?', options: ['A dataset of correct answers','Rewards and penalties from the environment','Clustering of similar states','Labelled training examples'], correct: 1 },
            { q: 'Why is RL well-suited to games?', options: ['Games have simple rules','Clear reward signals and simulation without real-world risk','No neural networks needed','Fixed number of moves'], correct: 1 },
            { q: 'Real-world RL application outside games?', options: ['Email spam filtering','Image captioning','Robotic arm control / energy optimisation','Sentiment analysis'], correct: 2 },
          ],
        },
        {
          num: 9, title: 'Common ML Mistakes & Bias', duration: '120 min',
          outcomes: ['Distinguish overfitting from underfitting','Recognise sources of data and algorithmic bias','Apply ethical AI principles'],
          keyPoints: [
            'Overfitting: model too complex — memorises training noise, fails on new data. Fix: simpler model, more data, regularisation.',
            'Underfitting: too simple — misses important patterns. Fix: more complex model or more features.',
            'Historical bias: training on past discriminatory data (e.g., Amazon hiring tool penalised women).',
            'Representation bias: some groups underrepresented in training data.',
            'Ethical AI principles: Fairness, Transparency, Accountability, Privacy, Robustness.',
          ],
          videos: [
            { title: '"Fighting Bias in Algorithms" — Joy Buolamwini (TED)', query: 'Joy Buolamwini fighting bias algorithms TED', duration: '9 min' },
            { title: '"Algorithmic Bias Explained" — NYT', query: 'Algorithmic Bias Explained New York Times', duration: '3 min' },
          ],
          activity: { name: 'Bias Audit Simulation', steps: [
            "Scenario: An AI hiring tool was trained on 10 years of data where 80% of hires were male.",
            'The AI learns to penalise CVs containing words like "women\'s club president".',
            'Q1: What type of bias is this? (Historical / representation bias)',
            'Q2: How would you reduce it? (Remove gender identifiers, balance training data, audit outcomes)',
            'Reflect: What other societal biases could end up in AI training data?',
          ]},
          selfCheck: [
            { q: 'A model scores 98% on training data but only 62% on test data. This is:', options: ['Underfitting','Overfitting','Optimal fitting','Transfer learning'], correct: 1 },
            { q: 'Which is an example of AI bias?', options: ['Face recognition that works well on light skin but poorly on dark skin','A model that trains slowly','A model that uses too many parameters','A recommender that shows too many ads'], correct: 0 },
            { q: 'Which is an ethical AI principle?', options: ['Speed','Transparency','Profitability','Complexity'], correct: 1 },
          ],
        },
        {
          num: 10, title: 'No‑Code ML: Build a Classifier with AutoML', duration: '120 min',
          outcomes: ['Use AutoML tools end-to-end','Experience upload → train → evaluate cycle','Understand accuracy and the confusion matrix'],
          keyPoints: [
            'AutoML automates model selection and tuning — no coding or ML expertise needed.',
            'Popular no-code tools: Teachable Machine, Lobe.ai (free desktop), Google AutoML Vision.',
            'Accuracy = correct predictions / total predictions × 100%. Can be misleading on imbalanced datasets.',
            'Confusion matrix: grid showing per-class errors — which classes the model confuses with which.',
          ],
          videos: [
            { title: '"Teachable Machine 2.0 Advanced Tips"', query: 'Teachable Machine 2.0 advanced tutorial', duration: '8 min' },
            { title: '"Microsoft Lobe Tutorial"', query: 'Microsoft Lobe machine learning tutorial', duration: '6 min' },
          ],
          activity: { name: '3-Class Fruit Classifier', steps: [
            'Create a 3-class project in Teachable Machine (e.g., Apple, Banana, Orange).',
            'Collect ≥ 50 images per class with variety (angles, lighting). Train.',
            'Create a test set of 15 images per class. Record predictions manually.',
            'Calculate accuracy: correct / 45 × 100%.',
            'Draw a 3×3 confusion matrix to see where mistakes happen.',
          ]},
          selfCheck: [
            { q: 'What does AutoML automate?', options: ['Writing Python code','Model selection, hyperparameter tuning, and training','Collecting training data','Designing the UI'], correct: 1 },
            { q: 'A skin-cancer model has 99% accuracy. Why might it still be bad?', options: ['Uses too much GPU','If 99% of images are benign, a model that always says "benign" gets 99% without actually learning','95%+ accuracy is always reliable','Trained on too few images'], correct: 1 },
            { q: 'The confusion matrix helps you understand:', options: ['How long training took','Which specific classes the model confuses with each other','Neural network architecture','Production cost'], correct: 1 },
          ],
        },
      ],
    },
    {
      num: 3, title: 'Language, Vision & Generative AI', color: '#7c3aed',
      days: [
        {
          num: 11, title: 'NLP & Chatbots', duration: '120 min',
          outcomes: ['Define NLP and list its main tasks','Understand transformer-based NLP','Contrast rule-based and AI chatbots'],
          keyPoints: [
            'NLP gives computers the ability to understand and generate human language.',
            'Key tasks: text classification, sentiment analysis, Named Entity Recognition (NER), machine translation, question answering.',
            'Modern NLP uses transformer models (BERT, GPT) pre-trained on massive text from the internet.',
            'NER extracts: people, places, organisations, and dates from text.',
            'Rule-based chatbots: predictable and safe, but rigid. AI chatbots: flexible but may "hallucinate" (invent facts).',
          ],
          videos: [
            { title: '"NLP in 10 Minutes" — Simplilearn', query: 'Natural Language Processing In 10 Minutes Simplilearn', duration: '10 min' },
            { title: '"How ChatGPT Works" — Code.org', query: 'How ChatGPT Works Code.org', duration: '5 min' },
          ],
          activity: { name: 'Design a Simple Chatbot', steps: [
            'On paper, design a rule-based pizza ordering chatbot.',
            'Write at least 10 if-then rules (e.g., "If user says \'hello\' → respond \'What size pizza?\'").',
            'Try your chatbot with a friend or family member.',
            'Reflect: what happens when someone asks something not in your rules? How does ChatGPT handle the same question?',
          ]},
          selfCheck: [
            { q: 'What does Named Entity Recognition (NER) extract?', options: ['Typos and grammar mistakes','People, places, organisations, and dates','Emotional tone','SEO keywords'], correct: 1 },
            { q: 'Key advantage of a rule-based chatbot over an AI chatbot?', options: ['Can answer any question','Learns from conversations','Its behaviour is predictable and safe','Cheaper to run'], correct: 2 },
            { q: 'True or False: Modern translation works purely by dictionary look-up.', options: ['True','False'], correct: 1 },
          ],
        },
        {
          num: 12, title: 'Computer Vision', duration: '120 min',
          outcomes: ['Explain how computers interpret images','Differentiate classification, detection, segmentation','Identify CV applications'],
          keyPoints: [
            'A digital image is a grid (matrix) of pixel values. CV uses deep learning to interpret these grids.',
            'Classification: one label per image. Detection: locate multiple objects with bounding boxes. Segmentation: label every pixel.',
            'CNNs automatically learn features — from edges to complex shapes — without human feature engineering.',
            'Applications: cancer detection in medical scans, drone crop monitoring, OCR, facial recognition, self-driving cars.',
            'Privacy concern: CV enables mass surveillance without consent.',
          ],
          table: { headers: ['Task','Description','Example'], rows: [
            ['Image Classification','Label the whole image','Cat vs. Dog classifier'],
            ['Object Detection','Locate and classify multiple objects','Self-driving car detecting pedestrians'],
            ['Segmentation','Label every pixel','Medical imaging, Zoom virtual background'],
            ['Facial Recognition','Identify or verify a person','Phone Face ID'],
            ['OCR','Extract text from images','Scanning printed documents'],
          ]},
          videos: [
            { title: '"How Computer Vision Works" — CrashCourse AI #5', query: 'How Computer Vision Works Crash Course AI', duration: '12 min' },
            { title: '"Object Detection vs Segmentation" — IBM Technology', query: 'Object Detection Image Segmentation IBM Technology', duration: '6 min' },
          ],
          activity: { name: 'Explore Vision APIs', steps: [
            'Search "YOLOv8 Hugging Face demo" and open a free demo.',
            'Upload a street scene photo.',
            'Observe: which objects are detected? What are the confidence scores?',
            'Write 100 words on a CV application idea in a field you care about.',
          ]},
          selfCheck: [
            { q: 'Key difference between image classification and object detection?', options: ['Classification is slower','Classification gives one label; detection gives multiple bounding boxes','Detection only works on faces','Classification needs more data'], correct: 1 },
            { q: 'What is a pixel?', options: ['A type of AI model','The smallest unit of a digital image','A neural network layer','A camera sensor'], correct: 1 },
            { q: 'Which technology reads text from scanned documents?', options: ['NLP','Reinforcement Learning','OCR (Optical Character Recognition)','Clustering'], correct: 2 },
          ],
        },
        {
          num: 13, title: 'Generative AI', duration: '120 min',
          outcomes: ['Define Generative AI','Name key model architectures (GANs, diffusion)','Use free Generative AI tools hands-on'],
          keyPoints: [
            'Generative AI creates new content — text, images, music, video, code.',
            'GANs: generator vs. discriminator in adversarial training. Diffusion models: gradually denoise random noise into an image (DALL-E, Stable Diffusion). Transformers: autoregressive token prediction (GPT).',
            'Tools: ChatGPT (text), DALL-E 3 / Midjourney (images), Suno.ai (music), GitHub Copilot (code).',
            'Limitations: hallucinations (confident falsehoods), bias, copyright issues, deepfake misuse.',
          ],
          videos: [
            { title: '"How AI Image Generators Work" — Vox', query: 'How AI Image Generators Work Vox', duration: '8 min' },
            { title: '"Generative AI in 2 minutes" — Google Cloud', query: 'Generative AI explained 2 minutes Google Cloud', duration: '2 min' },
          ],
          activity: { name: 'Prompt-based Creation', steps: [
            'Text: Ask ChatGPT to write a poem about AI in Shakespeare\'s style.',
            'Image: Go to bing.com/create (free DALL-E 3). Prompt: "futuristic cityscape at sunset, neon lights, flying cars, digital art".',
            'Music: Try suno.ai — generate a 30-second clip from a text description.',
            'Experiment: vary your prompts and record which produces the best output.',
          ]},
          selfCheck: [
            { q: 'Which architecture uses a "generator" and "discriminator" trained adversarially?', options: ['Transformer','GAN (Generative Adversarial Network)','Diffusion Model','CNN'], correct: 1 },
            { q: 'What is an AI "hallucination"?', options: ['Distorted faces in images','Model confidently states something factually false','Model is too slow','Model refuses to answer'], correct: 1 },
            { q: 'Which is a genuine ethical concern about Generative AI?', options: ['Makes computers overheat','Uses too many colours','Can create deepfakes and non-consensual synthetic media','Only works in English'], correct: 2 },
          ],
        },
        {
          num: 14, title: 'Prompt Engineering for Non‑Programmers', duration: '120 min',
          outcomes: ['Understand prompt engineering','Apply the CRAFT framework','Use few-shot and chain-of-thought techniques'],
          keyPoints: [
            'Prompt engineering: designing inputs to get the best outputs from a generative AI model.',
            'CRAFT Framework: Context (background), Role (persona for AI), Action (what to do), Format (output structure), Tone (style).',
            'Few-shot prompting: provide 1–3 examples in the prompt to show the model exactly what you want.',
            'Chain-of-thought: ask the model to "think step by step" — improves accuracy on reasoning tasks.',
            'For image generation: describe style, lighting, quality, and composition explicitly.',
          ],
          videos: [
            { title: '"Mastering Prompt Engineering" — Jeff Su', query: 'Mastering Prompt Engineering Jeff Su', duration: '10 min' },
            { title: 'LearnPrompting.org Basics', query: 'LearnPrompting beginners guide prompt engineering', duration: 'Self-paced' },
          ],
          activity: { name: 'Prompt Lab', steps: [
            'Task A — Text: Weak prompt: "Give me a workout plan." Rewrite with CRAFT: add context, role (personal trainer), action, format (table), tone (motivating). Compare outputs.',
            'Task B — Image: Start with "a dog". Refine to "fluffy Samoyed in sunflowers, golden hour, 4K photography". Observe the improvement.',
            'Record your before/after prompts and best outputs.',
          ]},
          selfCheck: [
            { q: 'What does the "R" in CRAFT stand for?', options: ['Result','Role','Reasoning','Relevance'], correct: 1 },
            { q: 'What is few-shot prompting?', options: ['Running the model multiple times','Providing 1–3 examples in the prompt to guide output style','Using a small AI model','Asking very short questions'], correct: 1 },
            { q: 'Adding "think step by step" to a prompt is called:', options: ['Role prompting','Negative prompting','Chain-of-thought prompting','Zero-shot prompting'], correct: 2 },
          ],
        },
        {
          num: 15, title: 'AI Ethics & Deepfakes', duration: '120 min',
          outcomes: ['Articulate core ethical dimensions of AI','Define deepfakes and their creation','Identify detection methods and regulation'],
          keyPoints: [
            'Ethical dimensions: Fairness, Accountability, Transparency, Privacy, Safety, Environmental impact (LLM training uses enormous energy).',
            'Deepfakes: synthetic media via GANs/autoencoders. Malicious uses: non-consensual images, political disinformation, financial fraud.',
            'Detection clues: unnatural blinking, skin texture inconsistencies, hair/glasses boundary artifacts, audio-lip sync errors.',
            'Regulation: EU AI Act (risk-based tiers), US state-level laws, India IT Rules 2021.',
          ],
          videos: [
            { title: '"Deepfakes and the Future of Truth" — Sam Gregory (TED)', query: 'Deepfakes future of truth Sam Gregory TED', duration: '12 min' },
            { title: '"How Deepfakes Are Made" — WIRED', query: 'How Deepfakes Are Made WIRED', duration: '5 min' },
          ],
          activity: { name: 'Spot the Deepfake', steps: [
            'Go to whichfaceisreal.com.',
            'Play 20 rounds and record your score.',
            'After each mistake, look at the tell-tale signs (eyes, hair edges, background).',
            'Reflect: with rapidly improving Generative AI, how can society combat AI-generated misinformation?',
          ]},
          selfCheck: [
            { q: 'Why is transparency an important AI ethics principle?', options: ['Makes AI faster','Allows people to understand and challenge AI decisions','Reduces cost','Improves accuracy'], correct: 1 },
            { q: 'Common tell-tale sign of a deepfake video?', options: ['Background is too sharp','Unnatural blinking or flickering around the face border','Too high resolution','Subject speaks too slowly'], correct: 1 },
            { q: 'The EU AI Act classifies AI systems based on:', options: ['Their cost','The risk level they pose to society','Country of origin','Energy consumption'], correct: 1 },
          ],
        },
      ],
    },
    {
      num: 4, title: 'AI at Work & Future', color: '#dc2626',
      days: [
        {
          num: 16, title: 'AI in Healthcare, Agriculture & Education', duration: '120 min',
          outcomes: ['Explain AI applications in three sectors','Identify both benefits and challenges'],
          keyPoints: [
            'Healthcare: AI detects cancer in scans, accelerates drug discovery by predicting molecular interactions, powers virtual health assistants.',
            'Agriculture: precision farming uses drones for crop health monitoring, ML predicts yield, robots do weeding. Challenge: access for small farmers.',
            'Education: personalised learning adapts to each student (Khan Academy, MATHia), automated grading, AI language tutors.',
            'Cross-sector challenges: data privacy, algorithmic bias, over-reliance, and the need for human oversight.',
          ],
          videos: [
            { title: '"AI in Healthcare" — The Medical Futurist', query: 'AI in Healthcare Medical Futurist', duration: '8 min' },
            { title: '"How AI is transforming agriculture" — BBC Click', query: 'How AI transforming agriculture BBC Click', duration: '6 min' },
          ],
          activity: { name: 'Sector Brainstorm', steps: [
            'Choose one sector: healthcare, agriculture, or education.',
            'Define a specific problem AI could solve.',
            'Describe: What data is needed? What will AI predict? Ethical concerns?',
            'Write a one-page concept note using the 6-step AI project cycle.',
          ]},
          selfCheck: [
            { q: 'How does AI help in drug discovery?', options: ['Writes prescriptions','Predicts molecular interactions to speed up drug candidate identification','Manufactures drugs','Replaces clinical trials'], correct: 1 },
            { q: 'What is "precision farming"?', options: ['Farming in precise GPS coordinates','Using AI and sensors to apply the right treatment at the right time','Lab-grown food','A type of crop insurance'], correct: 1 },
            { q: 'What is "personalised learning"?', options: ['Learning from personal mentors only','AI that adapts content, pace, and style to each student','A premium service','Face-to-face only learning'], correct: 1 },
          ],
        },
        {
          num: 17, title: 'AI for Personal Productivity (No‑Code)', duration: '120 min',
          outcomes: ['Discover AI productivity tools','Build a simple automation workflow without code'],
          keyPoints: [
            'Writing & editing: Grammarly (grammar), ChatGPT (drafting/summarising), Notion AI (note organisation).',
            'Transcription: Otter.ai converts meeting audio to searchable text in real time.',
            'Automation: Zapier connects apps with "if this, then that" logic. A "Zap" = one trigger + one or more actions.',
            'Spreadsheets: Google Sheets "Explore" and Excel "Analyse Data" auto-generate charts and insights.',
          ],
          videos: [
            { title: '"Top 10 AI Productivity Tools" — Matt Wolfe', query: 'Top 10 AI Tools Productivity Matt Wolfe', duration: '12 min' },
            { title: '"How to use Zapier AI" — Zapier', query: 'How to use Zapier AI automation', duration: '5 min' },
          ],
          activity: { name: 'Design Your AI Productivity Stack', steps: [
            'List three repetitive tasks in your daily work or study.',
            'For each, find an AI tool that could help (Otter.ai, ChatGPT, Excel AI…).',
            'Optional: Set up one free Zapier automation.',
            'Estimate how much time per week your AI stack could save.',
          ]},
          selfCheck: [
            { q: 'In Zapier, what is a "Zap"?', options: ['A type of AI model','A trigger combined with one or more actions across apps','A premium subscription','A notification alert'], correct: 1 },
            { q: 'Which tool transcribes meeting audio to text?', options: ['Grammarly','Otter.ai','Notion AI','ChatGPT'], correct: 1 },
            { q: 'What does Google Sheets "Explore" do?', options: ['Opens a web browser','Suggests charts, trends, and data summaries automatically','Connects to external APIs','Spell-checks cell values'], correct: 1 },
          ],
        },
        {
          num: 18, title: 'Building an AI Project (Step‑by‑Step, No Code)', duration: '120 min',
          outcomes: ['Apply the 6-step AI project cycle','Scope and plan a no-code solution'],
          keyPoints: [
            '6-Step AI Project Cycle: (1) Problem Scoping → (2) Data Acquisition → (3) Data Preparation → (4) Modelling → (5) Evaluation → (6) Deployment.',
            'Example: classify customer emails by urgency using MonkeyLearn + Zapier → route high-urgency to a human agent automatically.',
            'No-code project ideas: wildlife species ID, student question sorter, exercise form checker.',
            'Always document ethical considerations: bias risks, privacy, human oversight mechanism.',
          ],
          videos: [
            { title: '"Build an AI Project Without Coding" — Nicholas Renotte', query: 'Build AI project without coding Nicholas Renotte', duration: '15 min' },
          ],
          activity: { name: 'Your AI Project Blueprint', steps: [
            'Choose a problem in your community or workplace.',
            '(1) Problem: exactly what will the AI predict or classify?',
            '(2) Data: where will it come from? How much is needed?',
            '(3) Preparation: what cleaning or labeling is required?',
            '(4) Modelling: which no-code tool? (Teachable Machine, Lobe, MonkeyLearn)',
            '(5) Evaluation: accuracy threshold? How will you test for bias?',
            '(6) Deployment: how do users interact? What is the human oversight plan?',
          ]},
          selfCheck: [
            { q: 'First step in the AI project cycle?', options: ['Collecting data','Training the model','Problem scoping — defining what the AI should predict','Deploying to production'], correct: 2 },
            { q: 'Why is data labeling necessary for supervised learning?', options: ['Reduces file size','The model needs correct answers to learn from','Improves inference speed','Labeling is optional'], correct: 1 },
            { q: 'Which no-code tool is designed for text classification?', options: ['Teachable Machine','Lobe.ai','MonkeyLearn','Zapier'], correct: 2 },
          ],
        },
        {
          num: 19, title: 'The Future of Work & Lifelong Learning', duration: '120 min',
          outcomes: ['Analyse how AI reshapes the job market','Identify uniquely human skills','Build a personal lifelong learning plan'],
          keyPoints: [
            'AI automates tasks, not entire jobs. Most roles will change, not disappear — doctors, lawyers, teachers, designers will be augmented.',
            'Most susceptible: repetitive data entry, routine document processing, basic customer service.',
            'New AI jobs: Prompt Engineer, AI Ethicist, Data Curator, AI Trainer, Model Auditor.',
            'Irreplaceable human skills: creativity, empathy, critical thinking, complex communication, contextual judgment.',
            'Lifelong learning is not optional — the half-life of professional skills is shrinking.',
          ],
          videos: [
            { title: '"Will robots take our jobs?" — BBC Ideas', query: 'Will robots take our jobs BBC Ideas', duration: '5 min' },
            { title: '"Jobs we\'ll lose to machines" — TED', query: 'Jobs we\'ll lose to machines ones we won\'t TED', duration: '5 min' },
          ],
          activity: { name: 'Personal Skills Audit', steps: [
            'List your top 10 job tasks or study activities.',
            'Rate each on automation likelihood: 1 (very unlikely) to 5 (very likely) in 10 years.',
            'For tasks rated 3–5, describe how AI could augment rather than replace you.',
            'Identify two new skills to learn next.',
            'Write your 3-month learning plan.',
          ]},
          selfCheck: [
            { q: 'Which is a NEW job created by AI?', options: ['Data entry clerk','Assembly line worker','Prompt Engineer','Telephone operator'], correct: 2 },
            { q: 'Which human skill is LEAST likely to be automated?', options: ['Sorting emails','Summarising documents','Empathy and emotional support in a crisis','Scheduling calendar appointments'], correct: 2 },
            { q: 'What does "lifelong learning" mean in the AI era?', options: ['Getting a second university degree','Continuously updating skills throughout your career','Learning only in childhood','Only studying AI topics'], correct: 1 },
          ],
        },
        {
          num: 20, title: 'Course Wrap‑Up & Exam Preparation', duration: '120 min',
          outcomes: ['Consolidate all 4 weeks of learning','Review exam format and strategy','Practice with sample questions'],
          keyPoints: [
            'Hierarchy: AI ⊃ ML ⊃ Deep Learning ⊃ Generative AI.',
            'Learning types: Supervised (labeled), Unsupervised (unlabeled patterns), Reinforcement (rewards).',
            'NLP: text tasks, transformer models, rule-based vs. AI chatbots.',
            'Computer Vision: classification, detection, segmentation, OCR.',
            'Generative AI: GANs, diffusion models; tools: ChatGPT, DALL-E, Suno.',
            'Ethics: bias, fairness, transparency, accountability, deepfakes.',
            'Project Cycle: Scope → Data → Prepare → Model → Evaluate → Deploy.',
          ],
          videos: [],
          activity: { name: 'Final Reflection', steps: [
            'Write 3 things you learned that surprised you most.',
            'Write 3 ways you\'ll use AI tools differently starting tomorrow.',
            'Review the Quick Revision Summary (key terms and hierarchy).',
            'Rest well — you\'ve earned it!',
          ]},
          selfCheck: [
            { q: 'AI → ML → Deep Learning → Generative AI represents:', options: ['A timeline of AI development','A hierarchy where each is a subset of the one above','Four independent fields','Four types of neural networks'], correct: 1 },
            { q: 'Customer segmentation (grouping similar customers) uses:', options: ['Supervised learning','Reinforcement learning','Unsupervised learning','Transfer learning'], correct: 2 },
            { q: 'Assessment pass criteria for this course:', options: ['50% in all quizzes','72/180 overall AND ≥30/100 in Final Exam','100% attendance','Score 90% on every quiz'], correct: 1 },
          ],
        },
      ],
    },
  ],
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function CourseCatalog({ onStart, progress, completedCount, total }) {
  return (
    <div className="space-y-5 page-fade">
      {/* Section header */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Online Courses</h2>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Self-paced certificate courses — learn at your own pace, earn recognised credentials</p>
      </div>

      {/* Course card */}
      <div className="dark-card" style={{ overflow: 'hidden', maxWidth: 820 }}>
        {/* Hero banner */}
        <div style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#db2777 100%)', padding: '32px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 80, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.18)', color: '#fff' }}>CERTIFICATE COURSE</span>
              <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.12)', color: '#fff' }}>BEGINNER</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px', lineHeight: 1.2 }}>{COURSE.title}</h1>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', margin: '0 0 16px', maxWidth: 560 }}>{COURSE.description}</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { icon: 'ri-calendar-line', text: '4 Weeks · 20 Days' },
                { icon: 'ri-time-line', text: '2 Hours / Day' },
                { icon: 'ri-user-line', text: `${COURSE.enrolled.toLocaleString()} enrolled` },
                { icon: 'ri-star-fill', text: `${COURSE.rating} rating` },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.9)', fontSize: 12.5 }}>
                  <i className={s.icon} style={{ fontSize: 14 }} />{s.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left: what you'll learn */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', marginBottom: 10 }}>What You Will Learn</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {COURSE.topics.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#475569' }}>
                    <i className="ri-checkbox-circle-line" style={{ fontSize: 14, color: '#10b981', flexShrink: 0, marginTop: 1 }} />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: assessment + CTA */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', marginBottom: 10 }}>Assessment</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {COURSE.assessment.map((a, i) => (
                  <div key={i} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid rgba(15,23,42,0.07)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{a.label}</p>
                    <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>{a.detail}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              {completedCount > 0 && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#4f46e5' }}>Your Progress</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4f46e5' }}>{completedCount}/{total} lessons</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                  </div>
                </div>
              )}

              <button onClick={onStart} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 8, fontSize: 14, padding: '11px 20px' }}>
                <i className={completedCount > 0 ? 'ri-play-circle-line' : 'ri-rocket-line'} />
                {completedCount > 0 ? 'Continue Learning' : 'Start Course'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Week overview cards */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 12 }}>Course Outline</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
          {COURSE.weeks.map(w => (
            <div key={w.num} className="dark-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>W{w.num}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Week {w.num}</span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: '0 0 6px' }}>{w.title}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{w.days.length} lessons · {w.days.reduce((s, d) => s + parseInt(d.duration), 0) / 60}h total</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuizSection({ day, lessonKey, quizState, setAnswer, submitQuiz }) {
  const allAnswered = day.selfCheck.every((_, i) => quizState.answers[i] !== undefined);
  const score = day.selfCheck.filter((q, i) => quizState.answers[i] === q.correct).length;

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ri-question-line" style={{ fontSize: 14, color: '#d97706' }} />
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Self-Check Quiz</h3>
      </div>

      {quizState.submitted && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: score === day.selfCheck.length ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${score === day.selfCheck.length ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: score === day.selfCheck.length ? '#047857' : '#b45309', margin: 0 }}>
            {score === day.selfCheck.length ? '🎉 Perfect score!' : `You got ${score}/${day.selfCheck.length} correct.`}
          </p>
          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Review highlighted answers below.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {day.selfCheck.map((q, qi) => {
          const selected = quizState.answers[qi];
          return (
            <div key={qi} style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 10px', lineHeight: 1.4 }}>
                Q{qi + 1}. {q.q}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options.map((opt, oi) => {
                  let bg = '#f8fafc', border = 'rgba(15,23,42,0.09)', color = '#475569';
                  if (selected === oi && !quizState.submitted) { bg = 'rgba(99,102,241,0.08)'; border = '#6366f1'; color = '#4f46e5'; }
                  if (quizState.submitted) {
                    if (oi === q.correct) { bg = 'rgba(16,185,129,0.08)'; border = '#10b981'; color = '#047857'; }
                    else if (selected === oi && oi !== q.correct) { bg = 'rgba(239,68,68,0.07)'; border = '#ef4444'; color = '#b91c1c'; }
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => setAnswer(qi, oi)}
                      disabled={quizState.submitted}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: bg, border: `1px solid ${border}`, borderRadius: 8, cursor: quizState.submitted ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {quizState.submitted && oi === q.correct && <i className="ri-check-line" style={{ fontSize: 10, color: '#047857' }} />}
                        {quizState.submitted && selected === oi && oi !== q.correct && <i className="ri-close-line" style={{ fontSize: 10, color: '#b91c1c' }} />}
                        {!quizState.submitted && selected === oi && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />}
                      </div>
                      <span style={{ fontSize: 12.5, color, fontWeight: selected === oi || (quizState.submitted && oi === q.correct) ? 600 : 400 }}>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!quizState.submitted && (
        <button
          onClick={submitQuiz}
          disabled={!allAnswered}
          className="btn btn-primary"
          style={{ marginTop: 14, opacity: allAnswered ? 1 : 0.5, gap: 6 }}
        >
          <i className="ri-send-plane-line" />Submit Answers
        </button>
      )}
    </div>
  );
}

function LessonContent({ day, weekColor, lessonKey, completed, quizState, setAnswer, submitQuiz, onComplete, allLessons, currentIdx, goLesson }) {
  const isCompleted = completed.has(lessonKey);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }} className="fade-in-up">
      {/* Day header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: weekColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{day.num}</span>
          </div>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: weekColor, margin: 0 }}>Day {day.num}</p>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{day.title}</h1>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: 'rgba(99,102,241,0.08)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.15)' }}>
              <i className="ri-time-line" style={{ marginRight: 4 }} />{day.duration}
            </span>
            {isCompleted && <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#047857', border: '1px solid rgba(16,185,129,0.2)' }}><i className="ri-check-line" style={{ marginRight: 4 }} />Completed</span>}
          </div>
        </div>
      </div>

      {/* Learning outcomes */}
      <div style={{ marginBottom: 24, padding: '14px 16px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.14)', borderRadius: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', margin: '0 0 8px' }}>Learning Outcomes</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {day.outcomes.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151' }}>
              <i className="ri-arrow-right-circle-line" style={{ fontSize: 14, color: '#6366f1', flexShrink: 0, marginTop: 1 }} />
              {o}
            </div>
          ))}
        </div>
      </div>

      {/* Core Reading: Key Points */}
      <div style={{ marginBottom: 24, background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ri-book-open-line" style={{ fontSize: 14, color: '#6366f1' }} />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Core Reading (60 min)</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {day.keyPoints.map((kp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid rgba(15,23,42,0.06)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: weekColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{i + 1}</span>
              </div>
              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.55 }}>{kp}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table (if present) */}
      {day.table && (
        <div style={{ marginBottom: 24, background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.07)', background: '#f8fafc' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>Reference Table</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {day.table.headers.map((h, i) => (
                    <th key={i} style={{ padding: '9px 14px', fontSize: 11.5, fontWeight: 700, color: '#0f172a', background: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid rgba(15,23,42,0.09)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {day.table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '8px 14px', fontSize: 12.5, color: '#475569', borderBottom: '1px solid rgba(15,23,42,0.06)', verticalAlign: 'top', lineHeight: 1.4 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Videos */}
      {day.videos.length > 0 && (
        <div style={{ marginBottom: 24, background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-youtube-line" style={{ fontSize: 14, color: '#dc2626' }} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Video & Multimedia (30 min)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {day.videos.map((v, i) => (
              <a
                key={i}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)', textDecoration: 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ri-play-circle-line" style={{ fontSize: 18, color: '#dc2626' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>{v.title}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0' }}>{v.duration} · Click to search on YouTube</p>
                </div>
                <i className="ri-external-link-line" style={{ fontSize: 14, color: '#94a3b8' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      <div style={{ marginBottom: 24, background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ri-hand-coin-line" style={{ fontSize: 14, color: '#059669' }} />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Hands-On Activity (20 min)</h3>
        </div>
        <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 8, marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#047857', margin: 0 }}>{day.activity.name}</p>
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {day.activity.steps.map((s, i) => (
            <li key={i} style={{ fontSize: 13, color: '#475569', lineHeight: 1.55 }}>{s}</li>
          ))}
        </ol>
      </div>

      {/* Self-check quiz */}
      <QuizSection day={day} lessonKey={lessonKey} quizState={quizState} setAnswer={setAnswer} submitQuiz={submitQuiz} />

      {/* Navigation + complete */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {currentIdx > 0 && (
            <button
              onClick={() => { const p = allLessons[currentIdx - 1]; goLesson(p.wi, p.di); }}
              className="btn btn-ghost"
              style={{ gap: 6, fontSize: 12.5 }}
            >
              <i className="ri-arrow-left-line" />Previous Lesson
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isCompleted && (
            <button onClick={onComplete} className="btn btn-success" style={{ gap: 6, fontSize: 13, padding: '8px 18px' }}>
              <i className="ri-check-double-line" />Mark Complete & Continue
            </button>
          )}
          {currentIdx < allLessons.length - 1 && (
            <button
              onClick={() => { const n = allLessons[currentIdx + 1]; goLesson(n.wi, n.di); }}
              className="btn btn-primary"
              style={{ gap: 6, fontSize: 12.5 }}
            >
              Next Lesson<i className="ri-arrow-right-line" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CertificateView({ user, onBack }) {
  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px' }}>
      <div style={{ maxWidth: 700, width: '100%' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', marginBottom: 24 }}>
          <i className="ri-arrow-left-line" /> Back to Course
        </button>

        {/* Certificate */}
        <div id="certificate-print" style={{ background: '#fff', border: '4px solid #4f46e5', borderRadius: 16, padding: '40px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 60px rgba(99,102,241,0.15)' }}>
          {/* Decorative corners */}
          <div style={{ position: 'absolute', top: 12, left: 12, width: 40, height: 40, borderTop: '3px solid #c7d2fe', borderLeft: '3px solid #c7d2fe', borderRadius: '4px 0 0 0' }} />
          <div style={{ position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderTop: '3px solid #c7d2fe', borderRight: '3px solid #c7d2fe', borderRadius: '0 4px 0 0' }} />
          <div style={{ position: 'absolute', bottom: 12, left: 12, width: 40, height: 40, borderBottom: '3px solid #c7d2fe', borderLeft: '3px solid #c7d2fe', borderRadius: '0 0 0 4px' }} />
          <div style={{ position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderBottom: '3px solid #c7d2fe', borderRight: '3px solid #c7d2fe', borderRadius: '0 0 4px 0' }} />

          <div style={{ marginBottom: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <i className="ri-award-line" style={{ fontSize: 28, color: '#fff' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6366f1', margin: 0 }}>Certificate of Completion</p>
          </div>

          <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 4px' }}>This is to certify that</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '8px 0 4px', letterSpacing: '-0.5px' }}>{user?.name || 'Student Name'}</h1>
          <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 24px' }}>has successfully completed the course</p>

          <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: 10, padding: '14px 24px', display: 'inline-block', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>AI for Non‑Programmers</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }}>4-Week Certificate Course · 40 Hours · University Management System</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 28 }}>
            {[{ label: 'Course Duration', val: '4 Weeks · 20 Days' }, { label: 'Study Hours', val: '40 Hours' }, { label: 'Lessons Completed', val: '20 / 20' }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Issued by Your Sarthi LMS · {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <button onClick={() => window.print()} className="btn btn-primary" style={{ gap: 6 }}>
            <i className="ri-printer-line" />Print Certificate
          </button>
          <button onClick={onBack} className="btn btn-ghost" style={{ gap: 6 }}>
            <i className="ri-arrow-left-line" />Back to Course
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function OnlineCourses({ user }) {
  const storageKey = `oc_progress_${user?.id || 'guest'}`;

  const [view, setView] = useState('catalog');
  const [weekIdx, setWeekIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);
  const [completed, setCompleted] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { return new Set(); }
  });
  const [quizState, setQuizState] = useState({});
  const [expandedWeeks, setExpandedWeeks] = useState(new Set([0]));
  const contentRef = useRef(null);

  const totalLessons = COURSE.weeks.reduce((s, w) => s + w.days.length, 0);
  const progress = Math.round(completed.size / totalLessons * 100);
  const currentDay = COURSE.weeks[weekIdx]?.days[dayIdx];
  const lessonKey = `w${weekIdx}d${dayIdx}`;
  const currentQuiz = quizState[lessonKey] || { answers: {}, submitted: false };
  const allLessons = COURSE.weeks.flatMap((w, wi) => w.days.map((_, di) => ({ wi, di })));
  const currentIdx = allLessons.findIndex(l => l.wi === weekIdx && l.di === dayIdx);

  const markComplete = () => {
    const next = new Set(completed);
    next.add(lessonKey);
    setCompleted(next);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
    const week = COURSE.weeks[weekIdx];
    if (dayIdx < week.days.length - 1) {
      setDayIdx(d => d + 1);
    } else if (weekIdx < COURSE.weeks.length - 1) {
      setWeekIdx(w => w + 1);
      setDayIdx(0);
      setExpandedWeeks(s => new Set([...s, weekIdx + 1]));
    }
    if (next.size === totalLessons) setTimeout(() => setView('certificate'), 400);
    contentRef.current?.scrollTo(0, 0);
  };

  const goLesson = (wi, di) => {
    setWeekIdx(wi); setDayIdx(di);
    setExpandedWeeks(s => new Set([...s, wi]));
    contentRef.current?.scrollTo(0, 0);
  };

  const setAnswer = (qIdx, aIdx) => {
    if (currentQuiz.submitted) return;
    setQuizState(s => ({ ...s, [lessonKey]: { answers: { ...(s[lessonKey]?.answers || {}), [qIdx]: aIdx }, submitted: false } }));
  };
  const submitQuiz = () => setQuizState(s => ({ ...s, [lessonKey]: { ...s[lessonKey], submitted: true } }));

  if (view === 'certificate') return <CertificateView user={user} onBack={() => setView('player')} />;

  if (view === 'catalog') {
    return (
      <CourseCatalog
        onStart={() => { setView('player'); setExpandedWeeks(new Set([0])); }}
        progress={progress}
        completedCount={completed.size}
        total={totalLessons}
      />
    );
  }

  // Player view
  return (
    <div className="page-fade" style={{ display: 'flex', height: 'calc(100vh - 108px)', borderRadius: 12, border: '1px solid rgba(15,23,42,0.09)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 272, flexShrink: 0, borderRight: '1px solid rgba(15,23,42,0.09)', overflowY: 'auto', background: '#fff' }}>
        <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(15,23,42,0.08)', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
          <button onClick={() => setView('catalog')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: 0, marginBottom: 8 }}>
            <i className="ri-arrow-left-line" />Back to Courses
          </button>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.3 }}>{COURSE.title}</p>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10.5, color: '#64748b' }}>Progress</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6366f1' }}>{completed.size}/{totalLessons}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
            </div>
          </div>
        </div>

        <div style={{ padding: '4px 0 8px' }}>
          {COURSE.weeks.map((week, wi) => {
            const expanded = expandedWeeks.has(wi);
            const wc = week.days.filter((_, di) => completed.has(`w${wi}d${di}`)).length;
            return (
              <div key={wi}>
                <button
                  onClick={() => setExpandedWeeks(s => { const n = new Set(s); expanded ? n.delete(wi) : n.add(wi); return n; })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: week.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>Week {week.num}:</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{week.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{wc}/{week.days.length}</span>
                    <i className={`ri-arrow-${expanded ? 'up' : 'down'}-s-line`} style={{ fontSize: 13, color: '#94a3b8' }} />
                  </div>
                </button>
                {expanded && week.days.map((day, di) => {
                  const key = `w${wi}d${di}`;
                  const done = completed.has(key);
                  const active = wi === weekIdx && di === dayIdx;
                  return (
                    <button
                      key={di}
                      onClick={() => goLesson(wi, di)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 26px', background: active ? 'rgba(99,102,241,0.07)' : 'none', border: 'none', borderLeft: active ? `2px solid ${week.color}` : '2px solid transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'left' }}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: done ? '#10b981' : active ? week.color : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {done
                          ? <i className="ri-check-line" style={{ fontSize: 9, color: '#fff' }} />
                          : <span style={{ fontSize: 8, fontWeight: 800, color: active ? '#fff' : '#94a3b8' }}>{day.num}</span>
                        }
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 11.5, fontWeight: active ? 600 : 400, color: active ? week.color : '#475569', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{day.title}</p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{day.duration}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Certificate link */}
          {completed.size === totalLessons && (
            <button
              onClick={() => setView('certificate')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', margin: '8px 0 0', background: 'rgba(99,102,241,0.08)', border: 'none', borderTop: '1px solid rgba(99,102,241,0.12)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              <i className="ri-award-line" style={{ fontSize: 16, color: '#6366f1' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>View Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Lesson content */}
      <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '24px 28px' }}>
        {currentDay && (
          <LessonContent
            day={currentDay}
            weekColor={COURSE.weeks[weekIdx].color}
            lessonKey={lessonKey}
            completed={completed}
            quizState={currentQuiz}
            setAnswer={setAnswer}
            submitQuiz={submitQuiz}
            onComplete={markComplete}
            allLessons={allLessons}
            currentIdx={currentIdx}
            goLesson={goLesson}
          />
        )}
      </div>
    </div>
  );
}
