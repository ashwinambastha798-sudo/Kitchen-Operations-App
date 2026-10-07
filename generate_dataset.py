import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Create synthetic dataset based on the requested schema
np.random.seed(42)

start_date = datetime(2024, 1, 11)
num_days = 1000
dates = [start_date + timedelta(days=i) for i in range(num_days)]

special_event_types = ['Regular', 'Corporate_Event', 'Holiday', 'Wedding_Banquet']
waste_categories = ['DAIRY', 'POULTRY', 'SEAFOOD', 'VEGETABLES', 'MEAT']
turnouts = ['LOW', 'MEDIUM', 'HIGH']
dishes = ['Classic Cheesecake', 'Roast Turkey Breast', 'Grilled Salmon', 'Pumpkin Soup', 'Chicken Tikka Masala']

df = pd.DataFrame({
    'Date': dates,
    'day_name': [d.strftime('%A') for d in dates],
})

df['special_event_type'] = np.random.choice(special_event_types, size=num_days, p=[0.7, 0.1, 0.1, 0.1])
df['special_event'] = (df['special_event_type'] != 'Regular').astype(int)
df['temperature_C'] = np.random.uniform(15.0, 35.0, size=num_days).round(1)
df['humidity_percent'] = np.random.uniform(40.0, 90.0, size=num_days).round(1)
df['Previous_Turnout'] = np.random.choice(turnouts, size=num_days)

# Generate target based on features
base_meals = 150
meals = base_meals + \
    (df['special_event'] * 200) + \
    (df['temperature_C'] * 2) + \
    (df['day_name'].isin(['Saturday', 'Sunday']).astype(int) * 100) + \
    np.random.normal(0, 20, size=num_days)

df['meals_served'] = meals.astype(int)

# Leaky features
df['turnout_level'] = pd.qcut(df['meals_served'], 3, labels=['LOW', 'MEDIUM', 'HIGH'])
df['kitchen_staff'] = (df['meals_served'] // 20).astype(int)
df['past_waste_kg'] = (df['meals_served'] * np.random.uniform(0.05, 0.15, size=num_days)).round(2)
df['waste_category'] = np.random.choice(waste_categories, size=num_days)
df['unit_price_per_kg'] = np.random.uniform(5.0, 25.0, size=num_days).round(2)
df['shelf_life_days'] = np.random.randint(1, 15, size=num_days)
df['suggested_special_dish'] = np.random.choice(dishes, size=num_days)

df.to_csv('Kitchen_Inventory_Forecasting.csv', index=False)
print("Synthetic dataset created successfully.")
