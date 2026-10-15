from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import joblib
import pandas as pd
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import httpx
import json

from database import engine, get_db
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Dynamic Kitchen Inventory Forecasting API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model
model_path = os.getenv("MODEL_PATH", "dynamic_kitchen_model.joblib")
if not os.path.exists(model_path):
    model_path = os.path.join(os.path.dirname(__file__), '..', 'dynamic_kitchen_model.joblib')

try:
    preprocessor, features_to_keep, model = joblib.load(model_path)
except Exception as e:
    print("Warning: Could not load model", e)
    preprocessor, features_to_keep, model = None, None, None

model_2_path = os.getenv("MODEL_2_PATH", "recipe_recommendation_model.joblib")
if not os.path.exists(model_2_path):
    model_2_path = os.path.join(os.path.dirname(__file__), '..', 'recipe_recommendation_model.joblib')

try:
    inventory_model = joblib.load(model_2_path)
except Exception as e:
    print("Warning: Could not load model 2", e)
    inventory_model = None

class InventoryItemInput(BaseModel):
    name: str
    category: str
    shelf_life_days: int
    quantity: float
    unit: str

class ForecastRequest(BaseModel):
    date: str
    latitude: float
    longitude: float
    special_event_type: str
    previous_headcount: int = 150
    unit_price_per_kg: float = 10.0
    shelf_life_days: int = 5
    special_event: int = 0
    inventory: List[InventoryItemInput] = []

class InventoryItem(BaseModel):
    name: str
    shelf_life_days: int
    category: str

INVENTORY_DB = [
    {"name": "Milk", "shelf_life_days": 2, "category": "DAIRY"},
    {"name": "Fresh Salmon", "shelf_life_days": 1, "category": "SEAFOOD"},
    {"name": "Chicken Breast", "shelf_life_days": 4, "category": "POULTRY"},
    {"name": "Ribeye Steak", "shelf_life_days": 5, "category": "MEAT"},
    {"name": "Spinach", "shelf_life_days": 3, "category": "VEGETABLES"},
]

def get_inventory_action(headcount: float, rain: bool):
    if rain and headcount < 200:
        return "Heavy rain predicted: Reduce fresh produce orders by 20% to prevent waste"
    elif headcount > 400:
        return "High turnout expected: Increase meat and poultry orders by 20%"
    elif headcount > 250:
        return "Maintain standard inventory levels"
    else:
        return "Reduce perishable orders by 15%, utilize frozen stock"

def get_special_dish(category: str):
    dishes = {
        "DAIRY": "Creamy Four-Cheese Fondue",
        "SEAFOOD": "Seafood Chowder",
        "POULTRY": "Chicken Parmesan",
        "MEAT": "Beef Stroganoff",
        "VEGETABLES": "Roasted Root Veggie Platter"
    }
    return dishes.get(category, "Chef's Surprise")

@app.post("/api/predict")
async def get_predict(req: ForecastRequest):
    dt = datetime.strptime(req.date, "%Y-%m-%d")
    day_name = dt.strftime("%A")
    req.special_event = 1 if req.special_event_type != "Regular" else 0

    # Fetch real live weather for tomorrow
    async with httpx.AsyncClient() as client:
        # Fetch daily max temp and precipitation, hourly humidity to average it
        url = (f"https://api.open-meteo.com/v1/forecast?latitude={req.latitude}&longitude={req.longitude}"
               f"&daily=temperature_2m_max,precipitation_sum&hourly=relative_humidity_2m&timezone=auto")
        resp = await client.get(url)
        data = resp.json()
        
        # Find index for tomorrow's date
        try:
            date_idx = data['daily']['time'].index(req.date)
            temp_max = data['daily']['temperature_2m_max'][date_idx]
            precip = data['daily']['precipitation_sum'][date_idx]
        except (ValueError, KeyError):
            # Fallback
            temp_max = 30.0
            precip = 0.0

        # Average humidity for that day
        # Hourly time looks like "2024-10-07T00:00"
        humidity_vals = []
        try:
            for time_str, hum in zip(data['hourly']['time'], data['hourly']['relative_humidity_2m']):
                if time_str.startswith(req.date) and hum is not None:
                    humidity_vals.append(hum)
            humidity_mean = sum(humidity_vals)/len(humidity_vals) if humidity_vals else 65.0
        except KeyError:
            humidity_mean = 65.0

    input_data = pd.DataFrame([{
        'day_name': day_name,
        'special_event_type': req.special_event_type,
        'Previous_Turnout': "HIGH" if req.previous_headcount > 300 else ("LOW" if req.previous_headcount < 100 else "MEDIUM"),
        'temperature_2m_max': temp_max,
        'relative_humidity_2m_mean': humidity_mean,
        'unit_price_per_kg': req.unit_price_per_kg,
        'shelf_life_days': req.shelf_life_days,
        'special_event': req.special_event
    }])
    
    if model is not None:
        X_trans = preprocessor.transform(input_data)
        X_opt = pd.DataFrame(X_trans, columns=preprocessor.get_feature_names_out())[features_to_keep]
        prediction = model.predict(X_opt)[0]
        
        # Scale prediction based on restaurant baseline (assuming model is trained on ~200 covers baseline)
        scale_factor = max(req.previous_headcount / 200.0, 0.1)
        prediction = prediction * scale_factor
    else:
        prediction = req.previous_headcount * 1.1 # Simple fallback
        
    headcount = int(round(prediction))
    
    # Check if rain is predicted (>5mm)
    is_rain = precip > 5.0
    action = get_inventory_action(headcount, is_rain)
    
    # Process dynamic inventory
    provided_inventory = req.inventory
    
    if len(provided_inventory) > 0:
        expiring_items = [item.dict() for item in provided_inventory if item.shelf_life_days <= 3]
        available_names = [item.name for item in provided_inventory]
    else:
        expiring_items = [item for item in INVENTORY_DB if item['shelf_life_days'] <= 3]
        available_names = []
        
    suggested_dishes = list(set([get_special_dish(item['category']) for item in expiring_items]))
    if len(suggested_dishes) == 0:
        suggested_dishes = ["Chef's Surprise"]
        
    # Generate shopping list
    shopping_list = []
    for item in INVENTORY_DB:
        if item['name'] not in available_names:
            shopping_list.append({"name": item['name'], "reason": "Out of stock"})
            
    for item in provided_inventory:
        if item.quantity < 2:
            shopping_list.append({"name": item.name, "reason": f"Low stock ({item.quantity} {item.unit})"})
    
    return {
        "predicted_headcount": headcount,
        "temperature_C": temp_max,
        "humidity_percent": round(humidity_mean, 1),
        "is_raining": is_rain,
        "inventory_action": action,
        "expiring_items": expiring_items,
        "suggested_special_dishes": suggested_dishes,
        "shopping_list": shopping_list
    }

class InventoryActionRequest(BaseModel):
    headcount: float
    items: List[InventoryItemInput]

@app.post("/api/inventory-action")
async def inventory_action(req: InventoryActionRequest):
    if inventory_model is None:
        return {"error": "Inventory Model not loaded"}
    
    results = []
    for item in req.items:
        df = pd.DataFrame([{
            'predicted_turnout': req.headcount,
            'ingredient': item.name,
            'quantity_available': item.quantity,
            'unit': item.unit,
            'days_to_expiry': item.shelf_life_days
        }])
        
        preds = inventory_model.predict(df)[0]
        results.append({
            "ingredient": item.name,
            "expiry_status": preds[0],
            "action_required": preds[1],
            "suggested_recipe": preds[2],
            "quantity_available": item.quantity,
            "unit": item.unit,
            "days_to_expiry": item.shelf_life_days
        })
    
    return {"recommendations": results}

@app.get("/api/health")
def health():
    return {"status": "ok"}

# --- DATABASE ENDPOINTS ---
class BatchCreate(BaseModel):
    name: str
    quantity: float
    unit: str
    unitCost: float
    orderDate: str
    expiryDate: str

@app.get("/api/inventory/batches")
def get_batches(x_user_id: str = Header("default"), db: Session = Depends(get_db)):
    return db.query(models.InventoryBatch).filter(models.InventoryBatch.user_id == x_user_id).all()

@app.post("/api/inventory/batches")
def create_batch(batch: BatchCreate, x_user_id: str = Header("default"), db: Session = Depends(get_db)):
    db_batch = models.InventoryBatch(**batch.dict(), user_id=x_user_id)
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch

@app.delete("/api/inventory/batches/{batch_id}")
def delete_batch(batch_id: int, x_user_id: str = Header("default"), db: Session = Depends(get_db)):
    db_batch = db.query(models.InventoryBatch).filter(models.InventoryBatch.id == batch_id, models.InventoryBatch.user_id == x_user_id).first()
    if db_batch:
        db.delete(db_batch)
        db.commit()
    return {"status": "ok"}

@app.get("/api/menu")
def get_menu(db: Session = Depends(get_db)):
    items = db.query(models.MenuItem).all()
    res = []
    for item in items:
        res.append({
            "id": item.id,
            "name": item.name,
            "basePrice": item.basePrice,
            "ingredients": json.loads(item.ingredients_json)
        })
    return res

@app.get("/api/inventory/par-levels")
def get_par_levels(db: Session = Depends(get_db)):
    levels = db.query(models.ParLevel).all()
    return levels

@app.post("/api/setup-test-data")
def setup_test_data(db: Session = Depends(get_db)):
    db.query(models.InventoryBatch).delete()
    db.query(models.MenuItem).delete()
    db.query(models.ParLevel).delete()

    batches = [
        {"name": 'Chicken', "quantity": 18, "unit": 'kg', "unitCost": 8, "orderDate": '2024-10-01', "expiryDate": '2024-10-10'},
        {"name": 'Cheese', "quantity": 4, "unit": 'kg', "unitCost": 15, "orderDate": '2024-10-03', "expiryDate": '2024-10-25'},
        {"name": 'Tomatoes', "quantity": 12, "unit": 'kg', "unitCost": 3, "orderDate": '2024-10-05', "expiryDate": '2024-10-12'},
        {"name": 'Pasta', "quantity": 25, "unit": 'kg', "unitCost": 1.2, "orderDate": '2024-09-15', "expiryDate": '2025-01-01'},
        {"name": 'Tomatoes', "quantity": 5, "unit": 'kg', "unitCost": 3, "orderDate": '2024-10-02', "expiryDate": '2024-10-09'}
    ]
    for b in batches:
        db.add(models.InventoryBatch(**b))

    menu = [
        {"name": 'Chicken Parmesan', "basePrice": 24, "ingredients_json": json.dumps([{"name": 'Chicken', "qty": 0.25}, {"name": 'Cheese', "qty": 0.1}, {"name": 'Tomatoes', "qty": 0.2}])},
        {"name": 'Seafood Pasta', "basePrice": 28, "ingredients_json": json.dumps([{"name": 'Pasta', "qty": 0.2}, {"name": 'Fish', "qty": 0.2}, {"name": 'Tomatoes', "qty": 0.1}])},
        {"name": 'Mutton Stew', "basePrice": 26, "ingredients_json": json.dumps([{"name": 'Mutton', "qty": 0.3}, {"name": 'Tomatoes', "qty": 0.1}, {"name": 'Bread', "qty": 0.1}])},
        {"name": 'Classic Omelette', "basePrice": 14, "ingredients_json": json.dumps([{"name": 'Eggs', "qty": 0.1}, {"name": 'Cheese', "qty": 0.05}, {"name": 'Milk', "qty": 0.05}])},
        {"name": 'Margherita Pizza', "basePrice": 18, "ingredients_json": json.dumps([{"name": 'Flour', "qty": 0.3}, {"name": 'Cheese', "qty": 0.2}, {"name": 'Tomatoes', "qty": 0.15}])}
    ]
    for m in menu:
        db.add(models.MenuItem(**m))

    par_levels = [
        {"ingredient": 'Chicken', "level": 15, "cost": 8, "unit": 'kg'},
        {"ingredient": 'Cheese', "level": 5, "cost": 15, "unit": 'kg'},
        {"ingredient": 'Tomatoes', "level": 10, "cost": 3, "unit": 'kg'},
        {"ingredient": 'Pasta', "level": 20, "cost": 1.2, "unit": 'kg'},
        {"ingredient": 'Fish', "level": 10, "cost": 12, "unit": 'kg'},
        {"ingredient": 'Mutton', "level": 15, "cost": 14, "unit": 'kg'},
        {"ingredient": 'Bread', "level": 5, "cost": 2, "unit": 'kg'},
        {"ingredient": 'Eggs', "level": 5, "cost": 5, "unit": 'crates'},
        {"ingredient": 'Milk', "level": 2, "cost": 1.5, "unit": 'liters'},
        {"ingredient": 'Flour', "level": 15, "cost": 0.8, "unit": 'kg'}
    ]
    for p in par_levels:
        db.add(models.ParLevel(**p))

    db.commit()
    return {"status": "test data setup complete"}
