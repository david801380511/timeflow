"""
Notification Scheduler Service
Runs background checks to generate notifications based on rules
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models.notification_models import NotificationRule, Notification, NotificationPreference
from backend.models.models import Assignment, StudySession
from backend.models.calendar_models import CalendarBlock
from backend.models.user_models import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NotificationScheduler:
    """Background service for generating and scheduling notifications"""
    
    def __init__(self):
        self.running = False
        self.check_interval = 60  # Check every 60 seconds
    
    async def start(self):
        """Start the notification scheduler"""
        self.running = True
        logger.info("Notification scheduler started")
        
        while self.running:
            try:
                await self.check_and_send_notifications()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in notification scheduler: {e}")
                await asyncio.sleep(self.check_interval)
    
    def stop(self):
        """Stop the notification scheduler"""
        self.running = False
        logger.info("Notification scheduler stopped")
    
    async def check_and_send_notifications(self):
        """Check all active rules and generate notifications"""
        db = SessionLocal()
        try:
            current_time = datetime.utcnow()
            current_hour = current_time.hour
            current_day = current_time.strftime('%a').lower()
            
            # Get all active notification rules
            rules = db.query(NotificationRule).filter(
                NotificationRule.is_enabled == True
            ).all()
            
            for rule in rules:
                # Check if user has notifications enabled
                user = db.query(User).filter(User.id == rule.user_id).first()
                if not user:
                    continue
                
                pref = db.query(NotificationPreference).filter(
                    NotificationPreference.user_id == rule.user_id
                ).first()
                
                if pref and not pref.notifications_enabled:
                    continue
                
                # Check quiet hours
                if pref and pref.quiet_hours_enabled:
                    if self._is_quiet_hours(current_hour, pref.quiet_hours_start, pref.quiet_hours_end):
                        continue
                
                # Check day restrictions
                if rule.only_on_days:
                    allowed_days = [d.strip() for d in rule.only_on_days.split(',')]
                    if current_day not in allowed_days:
                        continue
                
                # Check time range restrictions
                if rule.time_range_start is not None and rule.time_range_end is not None:
                    if not self._is_within_time_range(current_hour, rule.time_range_start, rule.time_range_end):
                        continue
                
                # Process rule based on type
                if rule.rule_type == 'deadline':
                    await self._check_deadline_notifications(rule, db, current_time)
                elif rule.rule_type == 'study_session':
                    await self._check_study_session_notifications(rule, db, current_time)
                elif rule.rule_type == 'streak':
                    await self._check_streak_notifications(rule, db, current_time)
                
            db.commit()
        except Exception as e:
            logger.error(f"Error checking notifications: {e}")
            db.rollback()
        finally:
            db.close()
    
    def _is_quiet_hours(self, current_hour, start_hour, end_hour):
        """Check if current time is within quiet hours"""
        if start_hour <= end_hour:
            return start_hour <= current_hour < end_hour
        else:  # Quiet hours span midnight
            return current_hour >= start_hour or current_hour < end_hour
    
    def _is_within_time_range(self, current_hour, start_hour, end_hour):
        """Check if current time is within allowed time range"""
        if start_hour <= end_hour:
            return start_hour <= current_hour < end_hour
        else:  # Range spans midnight
            return current_hour >= start_hour or current_hour < end_hour
    
    async def _check_deadline_notifications(self, rule, db, current_time):
        """Check and create notifications for approaching deadlines"""
        # Calculate trigger time
        if rule.trigger_unit == 'minutes':
            trigger_delta = timedelta(minutes=rule.trigger_time)
        elif rule.trigger_unit == 'hours':
            trigger_delta = timedelta(hours=rule.trigger_time)
        elif rule.trigger_unit == 'days':
            trigger_delta = timedelta(days=rule.trigger_time)
        else:
            return
        
        # Find assignments that are due within the trigger window
        trigger_start = current_time + trigger_delta - timedelta(minutes=30)
        trigger_end = current_time + trigger_delta + timedelta(minutes=30)
        
        assignments = db.query(Assignment).filter(
            Assignment.user_id == rule.user_id,
            Assignment.completed == False,
            Assignment.due_date.between(trigger_start, trigger_end)
        ).all()
        
        for assignment in assignments:
            # Check if notification already sent recently
            existing = db.query(Notification).filter(
                Notification.user_id == rule.user_id,
                Notification.assignment_id == assignment.id,
                Notification.rule_id == rule.id,
                Notification.delivered_at >= current_time - timedelta(hours=1)
            ).first()
            
            if existing:
                continue
            
            # Calculate time remaining
            time_remaining = assignment.due_date - current_time
            time_str = self._format_time_remaining(time_remaining)
            
            # Generate notification message
            message = rule.message_template.format(
                assignment_name=assignment.name,
                time_remaining=time_str
            )
            
            # Create notification
            notification = Notification(
                user_id=rule.user_id,
                rule_id=rule.id,
                assignment_id=assignment.id,
                title=f"Assignment Due: {assignment.name}",
                message=message,
                notification_type='deadline',
                priority=rule.priority,
                action_url="/",
                action_text="View Assignment"
            )
            db.add(notification)
            logger.info(f"Created deadline notification for user {rule.user_id}: {assignment.name}")
    
    async def _check_study_session_notifications(self, rule, db, current_time):
        """Check and create notifications for upcoming study sessions"""
        # Calculate trigger time
        if rule.trigger_unit == 'minutes':
            trigger_delta = timedelta(minutes=rule.trigger_time)
        elif rule.trigger_unit == 'hours':
            trigger_delta = timedelta(hours=rule.trigger_time)
        else:
            return
        
        # Find calendar blocks (study sessions) starting within trigger window
        trigger_start = current_time + trigger_delta - timedelta(minutes=5)
        trigger_end = current_time + trigger_delta + timedelta(minutes=5)
        
        blocks = db.query(CalendarBlock).join(
            Assignment, CalendarBlock.assignment_id == Assignment.id
        ).filter(
            Assignment.user_id == rule.user_id,
            CalendarBlock.block_type == 'study',
            CalendarBlock.start_datetime.between(trigger_start, trigger_end)
        ).all()
        
        for block in blocks:
            # Check if notification already sent
            existing = db.query(Notification).filter(
                Notification.user_id == rule.user_id,
                Notification.calendar_block_id == block.id,
                Notification.rule_id == rule.id
            ).first()
            
            if existing:
                continue
            
            assignment = block.assignment
            time_remaining = block.start_datetime - current_time
            time_str = self._format_time_remaining(time_remaining)
            
            # Generate notification message
            message = rule.message_template.format(
                assignment_name=assignment.name if assignment else block.title,
                time_remaining=time_str
            )
            
            # Create notification
            notification = Notification(
                user_id=rule.user_id,
                rule_id=rule.id,
                calendar_block_id=block.id,
                assignment_id=block.assignment_id,
                title="Study Session Starting Soon",
                message=message,
                notification_type='study_session',
                priority=rule.priority,
                action_url="/calendar",
                action_text="View Calendar"
            )
            db.add(notification)
            logger.info(f"Created study session notification for user {rule.user_id}")
    
    async def _check_streak_notifications(self, rule, db, current_time):
        """Check and create notifications for streak maintenance"""
        user = db.query(User).filter(User.id == rule.user_id).first()
        if not user or user.current_streak == 0:
            return
        
        # Check if user has studied today
        today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        today_sessions = db.query(StudySession).filter(
            StudySession.assignment_id.in_(
                db.query(Assignment.id).filter(Assignment.user_id == rule.user_id)
            ),
            StudySession.start_time >= today_start
        ).count()
        
        if today_sessions > 0:
            return  # User already studied today
        
        # Check if notification already sent today
        existing = db.query(Notification).filter(
            Notification.user_id == rule.user_id,
            Notification.notification_type == 'streak',
            Notification.delivered_at >= today_start
        ).first()
        
        if existing:
            return
        
        # Calculate trigger time
        if rule.trigger_unit == 'hours':
            trigger_delta = timedelta(hours=rule.trigger_time)
        else:
            return
        
        # Check if it's time to send streak reminder
        time_until_midnight = (today_start + timedelta(days=1)) - current_time
        if time_until_midnight <= trigger_delta:
            message = rule.message_template.format(
                streak_days=user.current_streak
            )
            
            notification = Notification(
                user_id=rule.user_id,
                rule_id=rule.id,
                title="Maintain Your Streak!",
                message=message,
                notification_type='streak',
                priority=rule.priority,
                action_url="/timer",
                action_text="Start Studying"
            )
            db.add(notification)
            logger.info(f"Created streak notification for user {rule.user_id}")
    
    def _format_time_remaining(self, delta):
        """Format timedelta into human-readable string"""
        total_seconds = int(delta.total_seconds())
        
        if total_seconds < 60:
            return f"{total_seconds} seconds"
        elif total_seconds < 3600:
            minutes = total_seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''}"
        elif total_seconds < 86400:
            hours = total_seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''}"
        else:
            days = total_seconds // 86400
            return f"{days} day{'s' if days != 1 else ''}"


# Global scheduler instance
scheduler = NotificationScheduler()


def start_scheduler():
    """Start the notification scheduler in background"""
    asyncio.create_task(scheduler.start())


def stop_scheduler():
    """Stop the notification scheduler"""
    scheduler.stop()
