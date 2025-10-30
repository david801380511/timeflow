from backend.models.calendar_models import CalendarBlock
from backend.models.models import SessionLocal

db = SessionLocal()
blocks = db.query(CalendarBlock).order_by(CalendarBlock.id.desc()).limit(20).all()

print(f"\nLast 20 calendar blocks:")
print("-" * 80)
for b in blocks:
    print(f"ID {b.id}: {b.title}")
    print(f"  Time: {b.start_datetime} to {b.end_datetime}")
    print(f"  Type: {b.block_type}")
    print(f"  Assignment ID: {b.assignment_id}")
    print()

# Count blocks by type
work_blocks = [b for b in blocks if 'break' not in b.title.lower()]
break_blocks = [b for b in blocks if 'break' in b.title.lower()]

print(f"\nSummary:")
print(f"Work blocks: {len(work_blocks)}")
print(f"Break blocks: {len(break_blocks)}")
print(f"Total: {len(blocks)}")
