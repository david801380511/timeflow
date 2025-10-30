from backend.models.models import engine
from sqlalchemy import text

print("Adding preferred work hours columns to user_settings table...")

try:
    with engine.begin() as conn:
        # Add preferred_start_hour column
        conn.execute(text('ALTER TABLE user_settings ADD COLUMN preferred_start_hour INTEGER DEFAULT 9'))
        print("✓ Added preferred_start_hour column")

        # Add preferred_end_hour column
        conn.execute(text('ALTER TABLE user_settings ADD COLUMN preferred_end_hour INTEGER DEFAULT 17'))
        print("✓ Added preferred_end_hour column")

    print("\nMigration completed successfully!")
except Exception as e:
    if "duplicate column name" in str(e).lower():
        print("Columns already exist, skipping migration.")
    else:
        print(f"Error during migration: {e}")
