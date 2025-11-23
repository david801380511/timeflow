"""
Migration script to add notification tables to existing database
Run this if you already have a timeflow.db file
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import Base, SessionLocal, engine
from backend.models.notification_models import NotificationRule, Notification, NotificationPreference, create_default_notification_rules
from backend.models.user_models import User

def migrate_notifications():
    print("\n" + "="*60)
    print("NOTIFICATION SYSTEM MIGRATION")
    print("="*60 + "\n")
    
    try:
        # Create notification tables
        print("Creating notification tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created successfully\n")
        
        # Check existing users and create default rules
        db = SessionLocal()
        try:
            users = db.query(User).all()
            print(f"Found {len(users)} existing user(s)")
            
            for user in users:
                # Check if user already has notification rules
                existing_rules = db.query(NotificationRule).filter(
                    NotificationRule.user_id == user.id
                ).count()
                
                if existing_rules > 0:
                    print(f"  ✓ User '{user.username}' already has {existing_rules} notification rule(s)")
                else:
                    print(f"  Creating default notification rules for '{user.username}'...")
                    create_default_notification_rules(user.id, db)
                    print(f"  ✓ Created 5 default notification rules")
            
            print("\n" + "="*60)
            print("✓ Migration completed successfully!")
            print("="*60)
            print("\nYou can now:")
            print("1. Start the app: uvicorn app:app --reload")
            print("2. Login to your account")
            print("3. Click the bell icon to see notifications")
            print("4. Create assignments with upcoming due dates to test\n")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_notifications()
