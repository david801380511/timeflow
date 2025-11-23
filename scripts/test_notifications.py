"""
Test script for notification system
Run this after setting up the database and creating a user
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.models.notification_models import NotificationRule, Notification, NotificationPreference
from backend.models.user_models import User
from backend.models.models import Assignment
from datetime import datetime, timedelta

def test_notification_system():
    db = SessionLocal()
    
    try:
        print("\n" + "="*60)
        print("NOTIFICATION SYSTEM TEST")
        print("="*60 + "\n")
        
        # Get first user
        user = db.query(User).first()
        if not user:
            print("❌ No users found. Please create a user first.")
            return
        
        print(f"✓ Testing with user: {user.username}\n")
        
        # Check notification rules
        rules = db.query(NotificationRule).filter(
            NotificationRule.user_id == user.id
        ).all()
        
        print(f"📋 Notification Rules: {len(rules)}")
        for rule in rules:
            status = "✓ ENABLED" if rule.is_enabled else "✗ DISABLED"
            print(f"   {status} - {rule.name}")
            print(f"      Type: {rule.rule_type}")
            print(f"      Trigger: {rule.trigger_time} {rule.trigger_unit} before")
            print(f"      Priority: {rule.priority}")
            print()
        
        # Check notification preferences
        prefs = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user.id
        ).first()
        
        if prefs:
            print(f"⚙️  Notification Preferences:")
            print(f"   Notifications enabled: {prefs.notifications_enabled}")
            print(f"   Quiet hours: {prefs.quiet_hours_enabled}")
            if prefs.quiet_hours_enabled:
                print(f"   Quiet hours: {prefs.quiet_hours_start}:00 - {prefs.quiet_hours_end}:00")
            print(f"   Deadline notifications: {prefs.deadline_notifications}")
            print(f"   Study session notifications: {prefs.study_session_notifications}")
            print(f"   Break notifications: {prefs.break_notifications}")
            print(f"   Streak notifications: {prefs.streak_notifications}")
            print()
        
        # Check existing notifications
        notifications = db.query(Notification).filter(
            Notification.user_id == user.id
        ).order_by(Notification.delivered_at.desc()).limit(5).all()
        
        print(f"🔔 Recent Notifications: {len(notifications)}")
        if notifications:
            for notif in notifications:
                read_status = "✓ READ" if notif.is_read else "● UNREAD"
                print(f"   {read_status} - {notif.title}")
                print(f"      {notif.message}")
                print(f"      Delivered: {notif.delivered_at.strftime('%Y-%m-%d %H:%M')}")
                print()
        else:
            print("   No notifications yet")
            print()
        
        # Check assignments that could trigger notifications
        upcoming_assignments = db.query(Assignment).filter(
            Assignment.user_id == user.id,
            Assignment.completed == False,
            Assignment.due_date > datetime.utcnow()
        ).order_by(Assignment.due_date).limit(5).all()
        
        print(f"📚 Upcoming Assignments: {len(upcoming_assignments)}")
        if upcoming_assignments:
            for assignment in upcoming_assignments:
                time_until = assignment.due_date - datetime.utcnow()
                days = time_until.days
                hours = time_until.seconds // 3600
                
                if days > 0:
                    time_str = f"{days} day{'s' if days != 1 else ''}"
                elif hours > 0:
                    time_str = f"{hours} hour{'s' if hours != 1 else ''}"
                else:
                    time_str = "less than 1 hour"
                
                print(f"   • {assignment.name}")
                print(f"     Due in: {time_str}")
                print(f"     Progress: {assignment.time_spent}/{assignment.estimated_time} min")
                print()
        else:
            print("   No upcoming assignments")
            print()
        
        print("="*60)
        print("✓ Notification system is configured and ready!")
        print("="*60)
        print("\nNext steps:")
        print("1. Start the app: uvicorn app:app --reload")
        print("2. The notification scheduler will start automatically")
        print("3. Create assignments with upcoming due dates")
        print("4. Notifications will appear in the bell icon in the navbar")
        print("5. Check server logs for scheduler activity\n")
        
    except Exception as e:
        print(f"❌ Error testing notification system: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_notification_system()
