import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

df = pd.read_csv('Kitchen_Inventory_Forecasting.csv', parse_dates=['Date'])
df = df.sort_values('Date').reset_index(drop=True)

# Data Leakage Identification
leakage_cols = ['turnout_level', 'kitchen_staff', 'past_waste_kg', 'waste_category', 'suggested_special_dish']

# Step 2: Preprocessing & Encoding
X = df.drop(columns=['Date', 'meals_served'] + [col for col in leakage_cols if col in df.columns])
y = df['meals_served']

cat_features = ['day_name', 'special_event_type', 'Previous_Turnout']
num_features = ['temperature_2m_max', 'relative_humidity_2m_mean', 'unit_price_per_kg', 'shelf_life_days', 'special_event']

# Check for NaNs due to API failure on some days and fill with mean
X[num_features] = X[num_features].fillna(X[num_features].mean())

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), num_features),
        ('cat', OneHotEncoder(drop='first', sparse_output=False), cat_features)
    ])

X_transformed = preprocessor.fit_transform(X)
feature_names = preprocessor.get_feature_names_out()

# We can keep all features or drop irrelevant ones, let's keep all for simplicity
features_to_keep = feature_names

# 80/20 Train-Test Split (Chronological)
split_idx = int(len(X_transformed) * 0.8)
X_train, X_test = X_transformed[:split_idx], X_transformed[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

final_model = RandomForestRegressor(random_state=42, n_estimators=100)
final_model.fit(X_train, y_train)

joblib.dump((preprocessor, features_to_keep, final_model), 'dynamic_kitchen_model.joblib')

# Evaluation
y_pred = final_model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

print(f"Model Retrained Successfully!")
print(f"MAE: {mae:.2f}")
print(f"RMSE: {rmse:.2f}")
print(f"R² Score: {r2:.2f}")
