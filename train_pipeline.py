import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

df = pd.read_csv('Kitchen_Inventory_Forecasting.csv', parse_dates=['Date'])
df = df.sort_values('Date').reset_index(drop=True)

# Artifacts Dir
artifact_dir = r"C:\Users\smartuser\.gemini\antigravity-ide\brain\1897ccfa-56c6-4eac-84fd-e9db5d558428"
os.makedirs(artifact_dir, exist_ok=True)

# Step 1: EDA
report = []
report.append("# Kitchen Inventory Forecasting - Data Science Pipeline Report")
report.append("## Step 1: Exploratory Data Analysis (EDA)")

num_features = ['temperature_C', 'humidity_percent', 'past_waste_kg', 'unit_price_per_kg', 'shelf_life_days', 'meals_served', 'kitchen_staff']
report.append("### Summary Statistics for Numerical Features")
report.append(df[num_features].describe().to_markdown())

# Data Leakage Identification
leakage_cols = ['turnout_level', 'kitchen_staff', 'past_waste_kg', 'waste_category']
report.append("\n### Data Leakage & Feature Selection")
report.append(f"Excluded operational metrics representing the result of the turnout: {leakage_cols}")

# Step 2: Preprocessing & Encoding
report.append("\n## Step 2: Preprocessing & Encoding")
X = df.drop(columns=['Date', 'meals_served'] + leakage_cols)
y = df['meals_served']

# Also drop suggested_special_dish if it's there as it is not a predictor
if 'suggested_special_dish' in X.columns:
    X = X.drop(columns=['suggested_special_dish'])

cat_features = ['day_name', 'special_event_type', 'Previous_Turnout']
num_features = ['temperature_C', 'humidity_percent', 'unit_price_per_kg', 'shelf_life_days', 'special_event']

report.append(f"Categorical features (One-Hot Encoded): {cat_features}")
report.append(f"Numerical features (Standard Scaled): {num_features}")

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), num_features),
        ('cat', OneHotEncoder(drop='first', sparse_output=False), cat_features)
    ])

# Step 3: Feature Importance Scoring & Selection
report.append("\n## Step 3: Feature Importance Scoring & Selection")
X_transformed = preprocessor.fit_transform(X)
feature_names = preprocessor.get_feature_names_out()

rf = RandomForestRegressor(random_state=42, n_estimators=100)
rf.fit(X_transformed, y)
importances = rf.feature_importances_

fi_df = pd.DataFrame({'Feature': feature_names, 'Importance': importances}).sort_values(by='Importance', ascending=False)
report.append(fi_df.to_markdown())

# Plot feature importance
plt.figure(figsize=(10,6))
sns.barplot(x='Importance', y='Feature', data=fi_df)
plt.title('Feature Importances for Predicting Meals Served')
plt.tight_layout()
fi_plot_path = os.path.join(artifact_dir, "feature_importance.png")
plt.savefig(fi_plot_path)
plt.close()

# Drop lowest scoring features (e.g., bottom 2)
features_to_drop = fi_df.tail(2)['Feature'].tolist()
report.append(f"\nDropped irrelevant features to optimize and prevent overfitting: {features_to_drop}")

# Keep remaining features
features_to_keep = fi_df.head(len(fi_df)-2)['Feature'].tolist()
X_opt = pd.DataFrame(X_transformed, columns=feature_names)[features_to_keep]

# Step 4: 80/20 Train-Test Split (Chronological)
report.append("\n## Step 4: 80/20 Train-Test Split & Model Training")
split_idx = int(len(X_opt) * 0.8)
X_train, X_test = X_opt.iloc[:split_idx], X_opt.iloc[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

report.append("Split data chronologically to prevent future-data leakage (80% train, 20% test).")

final_model = RandomForestRegressor(random_state=42, n_estimators=100)
final_model.fit(X_train, y_train)

joblib.dump((preprocessor, features_to_keep, final_model), 'model.joblib')
report.append("\nExported preprocessor and final model to `model.joblib`")

# Step 5: Evaluation
report.append("\n## Step 5: Evaluation")
y_pred = final_model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

report.append(f"- **MAE**: {mae:.2f}")
report.append(f"- **RMSE**: {rmse:.2f}")
report.append(f"- **R² Score**: {r2:.2f}")

plt.figure(figsize=(8,8))
plt.scatter(y_test, y_pred, alpha=0.5)
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
plt.xlabel('Actual Headcount')
plt.ylabel('Predicted Headcount')
plt.title('Actual vs Predicted Meals Served')
plt.tight_layout()
scatter_path = os.path.join(artifact_dir, "actual_vs_predicted.png")
plt.savefig(scatter_path)
plt.close()

with open(os.path.join(artifact_dir, "data_science_report.md"), "w") as f:
    f.write("\n".join(report))
    f.write("\n\n")
    f.write(f"![Feature Importance](file:///{fi_plot_path.replace(os.sep, '/')})\n")
    f.write(f"![Actual vs Predicted](file:///{scatter_path.replace(os.sep, '/')})\n")

print("Pipeline execution complete. Report generated.")
