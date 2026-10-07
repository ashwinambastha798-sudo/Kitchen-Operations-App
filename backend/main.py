from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from typing import List, Optional
from datetime import datetime, timedelta
import os
# Force uvicorn reload to load the new Indian recipe ML model
import httpx

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
    Previous_Turnout: str
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
        'Previous_Turnout': req.Previous_Turnout,
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
    else:
        prediction = 300.0
        
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
