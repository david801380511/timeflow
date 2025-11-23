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

## Project Structure

```
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
```

## Setup

### Prerequisites
- Python 3.10 or higher
- pip (Python package installer)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/david801380511/timeflow.git
   cd timeflow
   ```

2. **Create and activate a virtual environment** (recommended)
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize the database**

   The database will be automatically created when you first run the application. If you need to manually initialize it:
   ```bash
   python scripts/init_db.py
   ```

5. **Run the application**
   ```bash
   uvicorn app:app --reload
   ```

   The server will start on [http://localhost:8000](http://localhost:8000)

6. **Access the application**

   Open your browser and navigate to:
   - Main app: [http://localhost:8000](http://localhost:8000)
   - API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Troubleshooting

**Issue: "python-multipart" error**
If you see an error about python-multipart being required:
```bash
pip install python-multipart
```

**Issue: Database errors**
If you encounter database errors, try deleting `timeflow.db` and restarting the application to create a fresh database.

## Usage

### Managing Assignments
1. Go to the home page
2. Fill out the form with assignment details
3. Click "Add Assignment" to save
4. View and track your assignments

### Using the Timer
1. Navigate to the Timer page
2. Select an assignment to work on (optional)
3. Click "Start" to begin a work session
4. Take breaks when prompted
5. The system will track your work and break times

### Customizing Settings
1. Go to Settings
2. Adjust timer settings as needed
3. Add or modify break activities
4. Configure notification preferences

## API Endpoints

- `GET /` - Home page with assignment list
- `GET /timer` - Pomodoro timer interface
- `GET /settings` - User settings and preferences
- `GET /api/settings` - Get user settings (JSON)
- `PUT /api/settings` - Update user settings
- `GET /api/break-activities` - List all break activities
- `POST /api/break-activities` - Add a new break activity
- `PUT /api/break-activities/{id}` - Update a break activity
- `DELETE /api/break-activities/{id}` - Delete a break activity

## Development

### Running Tests
```bash
pytest
```

### Database Migrations
This project uses SQLAlchemy with SQLite. To make changes to the database schema:

1. Install Alembic if not already installed:
   ```bash
   pip install alembic
   ```

2. Generate a new migration:
   ```bash
   alembic revision --autogenerate -m "Description of changes"
   ```

3. Apply the migration:
   ```bash
   alembic upgrade head
   ```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

