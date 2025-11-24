# TimeFlow Project

A web application for managing assignments, scheduling study time, and preventing burnout with a smart break system.

## Features

- **Assignment Management**
  - Add assignments with names, due dates, and estimated completion times
  - Edit assignment details and update progress via slider
  - Track progress on assignments
  - View all saved assignments in an organized list

- **Smart Break System**
  - Customizable Pomodoro-style timer with work intervals and breaks
  - Configurable work/break durations
  - Smart break suggestions based on activity type
  - Tracks completed work intervals

- **Break Activities**
  - Predefined break activities
  - Categorized by short and long breaks
  - Customizable activity suggestions
  - Track time spent on breaks

- **User Settings**
  - Customize work/break intervals
  - Configure auto-start preferences
  - Set number of short breaks before long breaks

- **Gamification & Social**
  - Earn points for completing assignments and focus sessions
  - Maintain daily streaks
  - Unlock achievements
  - Compete on the leaderboard

- **Modern Experience**
  - Beautiful, responsive UI built with Tailwind CSS
  - Full Dark Mode support
  - Interactive Calendar with Month and Day views

## Time Management & Music Features 

### Time Management Methods

TimeFlow offers multiple time management methods to help you stay productive:

#### Available Methods

- **Pomodoro (25/5)**
  - 25 minutes of focused work
  - 5-minute short breaks
  - 15-minute long break after 4 sessions

- **52/17 Method**
  - 52 minutes of focused work
  - 17-minute breaks
  - Based on productivity research

- **Flowtime**
  - Flexible work periods (default 45 min)
  - 15-minute short breaks
  - 30-minute long breaks
  - Adapts to your natural flow

- **Custom**
  - Set your own work/break intervals
  - Customize number of intervals before long break

#### Using the Timer
1. Select your preferred method from the dropdown
2. Click "Start" to begin your work session
3. The timer will automatically transition between work and break periods
4. Use the pause/resume button as needed

### Music Player

Enhance your focus with the built-in music player:

#### Features
- **Play/Pause** - Control your music with a single click
- **Station Selection** - Choose from various focus-enhancing stations
- **Now Playing** - See which station is currently playing
- **Volume Control** - Adjust the volume to your preference

#### Available Stations
- Lofi Hip Hop Radio
- Focus Flow
- Deep Focus
- Cinematic
- Nature Sounds

### Testing

To run the automated tests for these features:

1. Install test dependencies:
   ```bash
   pip install pytest playwright
   playwright install
Run the end-to-end tests:

bash
Copy code
pytest tests/e2e
How to Use
Set environment variables (optional, will use defaults if not set):

bash
Copy code
# Windows
set TEST_EMAIL=test@example.com
set TEST_PASSWORD=testpassword
bash
Copy code
# macOS/Linux
export TEST_EMAIL=test@example.com
export TEST_PASSWORD=testpassword
Run the tests:

bash
Copy code
python -m pytest tests/test_timer_and_music.py -v --headed
The test user will be automatically created in the database if it doesn't exist, and the tests will log in using these credentials.

Database Notes
The test user is created with default values for all fields

The password is hashed using SHA-256, matching your User model

The script is idempotent - it won't create duplicate users

Next Steps
Make sure your database is running and accessible

Run the tests to verify everything works

The test user will persist in your database between test runs

Project Structure
php
Copy code
timeflow/
├── app.py                 # Main application entry point
├── backend/               # Backend logic
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── schemas/           # Pydantic schemas
│   └── database.py        # Database connection
├── scripts/               # Utility scripts
├── static/                # Static assets (JS, CSS)
├── templates/             # HTML templates (Jinja2)
├── tests/                 # Test suite
│   └── e2e/               # End-to-end tests
└── requirements.txt       # Project dependencies
Setup
Prerequisites
Python 3.10 or higher

pip (Python package installer)

Installation Steps
Clone the repository

bash
Copy code
git clone https://github.com/david801380511/timeflow.git
cd timeflow
Create and activate a virtual environment (recommended)

bash
Copy code
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
Install dependencies

bash
Copy code
pip install -r requirements.txt
Initialize the database

The database will be automatically created when you first run the application. If you need to manually initialize it:

bash
Copy code
python scripts/init_db.py
Run the application

bash
Copy code
uvicorn app:app --reload
The server will start on http://localhost:8000

Access the application

Open your browser and navigate to:

Main app: http://localhost:8000

API docs: http://localhost:8000/docs

Troubleshooting
Issue: "python-multipart" error
If you see an error about python-multipart being required:

bash
Copy code
pip install python-multipart
Issue: Database errors
If you encounter database errors, try deleting timeflow.db and restarting the application to create a fresh database.

Usage
Managing Assignments
Go to the home page

Fill out the form with assignment details

Click "Add Assignment" to save

View and track your assignments

Using the Timer
Navigate to the Timer page

Select an assignment to work on (optional)

Click "Start" to begin a work session

Take breaks when prompted

The system will track your work and break times

Customizing Settings
Go to Settings

Adjust timer settings as needed

Add or modify break activities

Configure notification preferences

API Endpoints
GET / - Home page with assignment list

GET /timer - Pomodoro timer interface

GET /settings - User settings and preferences

GET /api/settings - Get user settings (JSON)

PUT /api/settings - Update user settings

GET /api/break-activities - List all break activities

POST /api/break-activities - Add a new break activity

PUT /api/break-activities/{id} - Update a break activity

DELETE /api/break-activities/{id} - Delete a break activity

Development
Running Tests
bash
Copy code
pytest
Database Migrations
This project uses SQLAlchemy with SQLite. To make changes to the database schema:

Install Alembic if not already installed:

bash
Copy code
pip install alembic
Generate a new migration:

bash
Copy code
alembic revision --autogenerate -m "Description of changes"
Apply the migration:

bash
Copy code
alembic upgrade head
Contributing
Fork the repository

Create a feature branch (git checkout -b feature/AmazingFeature)

Commit your changes (git commit -m 'Add some AmazingFeature')

Push to the branch (git push origin feature/AmazingFeature)

Open a Pull Request