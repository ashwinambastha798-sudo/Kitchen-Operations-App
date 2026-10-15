import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal, engine
import models
import json

def populate_db():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 1. Par Levels
    par_levels = [
        {"ingredient": "Tomatoes", "level": 50, "cost": 1.5, "unit": "kg"},
        {"ingredient": "Onions", "level": 40, "cost": 1.0, "unit": "kg"},
        {"ingredient": "Chicken Breast", "level": 30, "cost": 5.5, "unit": "kg"},
        {"ingredient": "Rice", "level": 100, "cost": 0.8, "unit": "kg"},
        {"ingredient": "Pasta", "level": 80, "cost": 1.2, "unit": "kg"},
        {"ingredient": "Olive Oil", "level": 20, "cost": 6.0, "unit": "Liters"},
        {"ingredient": "Salt", "level": 10, "cost": 0.5, "unit": "kg"},
        {"ingredient": "Pepper", "level": 5, "cost": 2.0, "unit": "kg"},
        {"ingredient": "Garlic", "level": 15, "cost": 3.0, "unit": "kg"},
        {"ingredient": "Cheese", "level": 25, "cost": 8.0, "unit": "kg"}
    ]
    
    for pl_data in par_levels:
        if not db.query(models.ParLevel).filter(models.ParLevel.ingredient == pl_data["ingredient"]).first():
            db.add(models.ParLevel(**pl_data))
            
    # 2. Menu Items
    menu_items = [
        {"name": "Margherita Pizza", "basePrice": 12.99, "ingredients_json": json.dumps({"Tomatoes": 0.3, "Cheese": 0.2, "Olive Oil": 0.05, "Salt": 0.01})},
        {"name": "Chicken Curry with Rice", "basePrice": 15.99, "ingredients_json": json.dumps({"Chicken Breast": 0.4, "Rice": 0.3, "Onions": 0.2, "Tomatoes": 0.2, "Garlic": 0.05, "Olive Oil": 0.05, "Salt": 0.02})},
        {"name": "Pasta Pomodoro", "basePrice": 10.99, "ingredients_json": json.dumps({"Pasta": 0.25, "Tomatoes": 0.3, "Olive Oil": 0.05, "Garlic": 0.02, "Salt": 0.01})},
        {"name": "Grilled Chicken Salad", "basePrice": 13.99, "ingredients_json": json.dumps({"Chicken Breast": 0.3, "Tomatoes": 0.2, "Olive Oil": 0.05, "Salt": 0.01, "Pepper": 0.01})},
        {"name": "Garlic Bread", "basePrice": 4.99, "ingredients_json": json.dumps({"Garlic": 0.05, "Olive Oil": 0.02, "Salt": 0.01})}
    ]
    
    for item_data in menu_items:
        if not db.query(models.MenuItem).filter(models.MenuItem.name == item_data["name"]).first():
            db.add(models.MenuItem(**item_data))
            
    # 3. Inventory Batches
    # Let's clear existing first to not duplicate batches endlessly if run multiple times
    db.query(models.InventoryBatch).delete()
    
    inventory_batches = [
        {"name": "Tomatoes", "quantity": 30.5, "unit": "kg", "unitCost": 1.5, "orderDate": "2026-10-01", "expiryDate": "2026-10-15"},
        {"name": "Tomatoes", "quantity": 10.0, "unit": "kg", "unitCost": 1.6, "orderDate": "2026-10-05", "expiryDate": "2026-10-20"},
        {"name": "Chicken Breast", "quantity": 15.0, "unit": "kg", "unitCost": 5.5, "orderDate": "2026-10-06", "expiryDate": "2026-10-10"},
        {"name": "Rice", "quantity": 80.0, "unit": "kg", "unitCost": 0.8, "orderDate": "2026-09-15", "expiryDate": "2027-09-15"},
        {"name": "Pasta", "quantity": 50.0, "unit": "kg", "unitCost": 1.2, "orderDate": "2026-09-20", "expiryDate": "2027-09-20"},
        {"name": "Olive Oil", "quantity": 10.0, "unit": "Liters", "unitCost": 6.0, "orderDate": "2026-08-01", "expiryDate": "2027-08-01"},
        {"name": "Onions", "quantity": 35.0, "unit": "kg", "unitCost": 1.0, "orderDate": "2026-10-02", "expiryDate": "2026-11-01"},
        {"name": "Cheese", "quantity": 12.0, "unit": "kg", "unitCost": 8.0, "orderDate": "2026-10-04", "expiryDate": "2026-10-25"}
    ]
    
    for batch_data in inventory_batches:
        db.add(models.InventoryBatch(**batch_data))

    db.commit()
    db.close()
    print("Database populated successfully!")

if __name__ == "__main__":
    populate_db()
