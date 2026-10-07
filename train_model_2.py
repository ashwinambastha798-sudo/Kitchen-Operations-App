import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import numpy as np

def main():
    # 1. Load Data
    df = pd.read_csv('Recipe_Recommendation_Dataset.csv')

    # Features and Targets
    X = df[['predicted_turnout', 'ingredient', 'quantity_available', 'unit', 'days_to_expiry']]
    y = df[['expiry_status', 'action_required', 'suggested_recipe']]

    # 2. Preprocess
    numeric_features = ['predicted_turnout', 'quantity_available', 'days_to_expiry']
    categorical_features = ['ingredient', 'unit']

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])

    # 3. Model Pipeline
    # RandomForestClassifier inherently supports multi-output classification.
    model = Pipeline([
        ('preprocessor', preprocessor),
        ('clf', RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced'))
    ])

    # 4. Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 5. Train
    print("Training Model 2 (Inventory Action Multi-Output Classifier)...")
    model.fit(X_train, y_train)

    # 6. Evaluate
    y_pred = model.predict(X_test)
    
    # Calculate accuracy for each target
    for i, target in enumerate(y.columns):
        acc = accuracy_score(y_test.iloc[:, i], y_pred[:, i])
        print(f"Accuracy for {target}: {acc:.2f}")

    # Exact match accuracy
    exact_match = np.all(y_test.values == y_pred, axis=1).mean()
    print(f"Exact Match Ratio (all 3 correct): {exact_match:.2f}")

    # 7. Export
    joblib.dump(model, 'recipe_recommendation_model.joblib')
    print("Model saved to recipe_recommendation_model.joblib")

if __name__ == "__main__":
    main()
