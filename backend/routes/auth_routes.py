from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.user_models import User, Achievement, UserAchievement
from backend.models.models import Assignment
from datetime import datetime, timedelta

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# Simple session storage (in-memory for class project)
# In production, you'd use Redis or database-backed sessions
active_sessions = {}
password_reset_tokens = {}  # Store reset tokens: {token: user_id}


def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Get the currently logged-in user from session"""
    session_token = request.cookies.get("session_token")
    if not session_token or session_token not in active_sessions:
        return None

    user_id = active_sessions[session_token]
    user = db.query(User).filter(User.id == user_id).first()
    return user


def require_login(request: Request, db: Session = Depends(get_db)):
    """Require user to be logged in"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    return user


def check_and_award_achievements(user: User, db: Session):
    """Check and award achievements to user based on their activity"""
    # Get user's stats
    assignments_created = db.query(Assignment).filter(Assignment.user_id == user.id).count()
    assignments_completed = db.query(Assignment).filter(
        Assignment.user_id == user.id,
        Assignment.completed == True
    ).count()

    # Get all achievements
    achievements = db.query(Achievement).all()

    # Get achievements user already has
    user_achievement_ids = [ua.achievement_id for ua in user.achievements]

    newly_awarded = []

    for achievement in achievements:
        # Skip if user already has this achievement
        if achievement.id in user_achievement_ids:
            continue

        # Check if user qualifies for this achievement
        earned = False

        if achievement.requirement_type == "assignments_created":
            earned = assignments_created >= achievement.requirement_value
        elif achievement.requirement_type == "assignments_completed":
            earned = assignments_completed >= achievement.requirement_value
        elif achievement.requirement_type == "streak":
            earned = user.current_streak >= achievement.requirement_value
        elif achievement.requirement_type == "total_points":
            earned = user.total_points >= achievement.requirement_value

        if earned:
            # Award achievement
            user_achievement = UserAchievement(
                user_id=user.id,
                achievement_id=achievement.id
            )
            db.add(user_achievement)
            user.total_points += achievement.points
            newly_awarded.append(achievement)

    if newly_awarded:
        db.commit()

    return newly_awarded


def update_user_streak(user: User, db: Session):
    """Update user's activity streak"""
    today = datetime.utcnow().date()

    if user.last_activity_date:
        last_activity = user.last_activity_date.date()
        days_diff = (today - last_activity).days

        if days_diff == 0:
            # Same day, no change
            return
        elif days_diff == 1:
            # Consecutive day, increment streak
            user.current_streak += 1
            if user.current_streak > user.longest_streak:
                user.longest_streak = user.current_streak
        else:
            # Streak broken
            user.current_streak = 1
    else:
        # First activity
        user.current_streak = 1
        user.longest_streak = 1

    user.last_activity_date = datetime.utcnow()
    db.commit()


@router.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request):
    """Show signup page"""
    return templates.TemplateResponse("signup.html", {"request": request})


@router.post("/signup")
async def signup(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create new user account"""
    try:
        # Check if username or email already exists
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing_user:
            return JSONResponse(
                status_code=400,
                content={"error": "Username or email already exists"}
            )

        # Create new user
        new_user = User(username=username, email=email)
        new_user.set_password(password)

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Award "First Steps" achievement for creating account
        try:
            check_and_award_achievements(new_user, db)
        except Exception as e:
            print(f"Error awarding achievements: {e}")
            # Don't fail signup if achievements fail

        return JSONResponse(content={"message": "Signup successful"})
    except Exception as e:
        print(f"Signup error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal Server Error: {str(e)}"}
        )


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Show login page"""
    return templates.TemplateResponse("login.html", {"request": request})


@router.post("/login")
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Login user"""
    try:
        user = db.query(User).filter(User.username == username).first()

        if not user or not user.check_password(password):
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid username or password"}
            )

        # Create session
        import secrets
        session_token = secrets.token_urlsafe(32)
        active_sessions[session_token] = user.id

        # Update user's streak
        try:
            update_user_streak(user, db)
        except Exception as e:
            print(f"Error updating streak: {e}")
            # Don't fail login if streak update fails

        # Create response with session cookie
        response = JSONResponse(content={"message": "Login successful"})
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            max_age=86400 * 30  # 30 days
        )

        return response
    except Exception as e:
        print(f"Login error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal Server Error: {str(e)}"}
        )


@router.get("/logout")
async def logout(request: Request):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token and session_token in active_sessions:
        del active_sessions[session_token]

    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie("session_token")
    return response


@router.get("/api/profile")
async def get_profile(request: Request, db: Session = Depends(get_db)):
    """Get current user's profile with gamification stats"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")

    # Get user's achievements with details
    achievements = []
    for ua in user.achievements:
        achievements.append({
            "id": ua.achievement.id,
            "name": ua.achievement.name,
            "description": ua.achievement.description,
            "icon": ua.achievement.icon,
            "points": ua.achievement.points,
            "earned_at": ua.earned_at.isoformat()
        })

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "total_points": user.total_points,
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
        "achievements": achievements
    }


@router.get("/profile", response_class=HTMLResponse)
async def profile_page(request: Request, db: Session = Depends(get_db)):
    """Show user profile page"""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=303)

    return templates.TemplateResponse("profile.html", {
        "request": request,
        "user": user
    })


@router.get("/api/leaderboard")
async def get_leaderboard(db: Session = Depends(get_db)):
    """Get leaderboard of top users by points"""
    users = db.query(User).order_by(User.total_points.desc()).limit(20).all()

    leaderboard = []
    for rank, user in enumerate(users, start=1):
        assignments_completed = db.query(Assignment).filter(
            Assignment.user_id == user.id,
            Assignment.completed == True
        ).count()

        leaderboard.append({
            "rank": rank,
            "username": user.username,
            "total_points": user.total_points,
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
            "assignments_completed": assignments_completed,
            "achievements_count": len(user.achievements)
        })

    return leaderboard


@router.get("/leaderboard", response_class=HTMLResponse)
async def leaderboard_page(request: Request, db: Session = Depends(get_db)):
    """Show leaderboard page"""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=303)

    return templates.TemplateResponse("leaderboard.html", {
        "request": request,
        "user": user
    })


@router.get("/api/achievements")
async def get_all_achievements(db: Session = Depends(get_db)):
    """Get all available achievements"""
    achievements = db.query(Achievement).all()

    return [{
        "id": ach.id,
        "name": ach.name,
        "description": ach.description,
        "icon": ach.icon,
        "points": ach.points,
        "requirement_type": ach.requirement_type,
        "requirement_value": ach.requirement_value
    } for ach in achievements]


@router.get("/forgot-password", response_class=HTMLResponse)
async def forgot_password_page(request: Request):
    """Show forgot password page"""
    return templates.TemplateResponse("forgot_password.html", {"request": request})


@router.post("/forgot-password")
async def forgot_password(
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """Handle forgot password request"""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Don't reveal if user exists or not for security
        # But for this project, we'll just say sent
        return JSONResponse(content={"message": "If an account exists with this email, a reset link has been sent."})

    # Generate reset token
    import secrets
    token = secrets.token_urlsafe(32)
    password_reset_tokens[token] = user.id
    
    # In a real app, send email here
    # For this project, print to console
    reset_link = f"http://127.0.0.1:8000/reset-password?token={token}"
    print(f"\n{'='*50}")
    print(f"PASSWORD RESET LINK FOR {email}:")
    print(f"{reset_link}")
    print(f"{'='*50}\n")
    
    return JSONResponse(content={"message": "Reset link has been printed to the server console (simulated email)."})


@router.get("/reset-password", response_class=HTMLResponse)
async def reset_password_page(request: Request, token: str):
    """Show reset password page"""
    if token not in password_reset_tokens:
        return templates.TemplateResponse("login.html", {"request": request, "error": "Invalid or expired reset token"})
        
    return templates.TemplateResponse("reset_password.html", {"request": request, "token": token})


@router.post("/reset-password")
async def reset_password(
    token: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Handle password reset"""
    if token not in password_reset_tokens:
        return JSONResponse(status_code=400, content={"error": "Invalid or expired reset token"})
        
    user_id = password_reset_tokens[token]
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        return JSONResponse(status_code=404, content={"error": "User not found"})
        
    # Update password
    user.set_password(password)
    db.commit()
    
    # Remove token
    del password_reset_tokens[token]
    
    return JSONResponse(content={"message": "Password updated successfully"})
