# Kitchen Operations & Inventory Forecasting App

A smart kitchen management and inventory forecasting system powered by machine learning, real-time meteorological weather feeds, and dynamic recipe recommendation algorithms.

---

## 🌟 Key Features

1. **Dynamic Headcount & Footfall Forecasting:**
   - Multi-model ML pipeline predicting daily customer covers/meals served using calendar effects, event tags, temperature, and relative humidity.
   - Live weather integration via Open-Meteo API.
2. **ML Model Benchmark & Evaluation:**
   - Benchmarks 4 regression architectures (Ridge, Random Forest, XGBoost, SVR) comparing $R^2$, MAE, RMSE, and MAPE.
   - Benchmarks 4 classification architectures (Logistic Regression, Random Forest, XGBoost, SVC) comparing Macro $F_1$, Weighted $F_1$, Accuracy, and Confusion Matrices.
   - Detailed visual comparison plots, residual analysis, and feature importances available in [MODEL_BENCHMARK.md](MODEL_BENCHMARK.md).
3. **Recipe & Perishable Inventory Optimization:**
   - Evaluates expiry status (`SAFE`, `WARNING`, `CRITICAL`) and recommends targeted operational actions (e.g., promotional batch cooking, special discount menus) to eliminate food waste.
4. **Interactive Dashboard:**
   - Modern React + Vite frontend with real-time forecast visualizers, batch management, and recipe suggestions.
5. **FastAPI Backend:**
   - REST endpoints with SQLAlchemy persistence, automated weather-fetching, and inference pipelines.

---

## 📊 Machine Learning Model Benchmarks

A comprehensive comparison was conducted across 4 distinct regression and classification architectures:

### Headcount / Meals Served Prediction (Regression)
- **Ridge Regression:** $R^2 = 0.9443$, $\text{MAE} = 20.01\text{ meals}$, $\text{Inference} = 0.002\text{ ms}$ *(Top linear baseline)*
- **Random Forest Regressor:** $R^2 = 0.9350$, $\text{MAE} = 21.47\text{ meals}$ *(Robust non-linear bagging)*
- **XGBoost Regressor:** $R^2 = 0.9345$, $\text{MAE} = 21.48\text{ meals}$
- **Support Vector Regressor (SVR):** $R^2 = 0.9256$, $\text{MAE} = 22.60\text{ meals}$

### Turnout Category Prediction (Classification)
- **Logistic Regression:** $\text{Macro } F_1 = 0.7290$, $\text{Accuracy} = 74.50\%$
- **Random Forest Classifier:** $\text{Macro } F_1 = 0.7214$, $\text{Accuracy} = 73.50\%$
- **XGBoost Classifier:** $\text{Macro } F_1 = 0.7006$, $\text{Accuracy} = 70.50\%$
- **Support Vector Classifier (SVC):** $\text{Macro } F_1 = 0.6868$, $\text{Accuracy} = 69.00\%$

> 📈 **For complete tables, actual vs. predicted scatter plots, confusion matrices, and feature importances, see [MODEL_BENCHMARK.md](MODEL_BENCHMARK.md).**

---

## 🚀 Quickstart

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/ashwinambastha798-sudo/Kitchen-Operations-App.git
cd Kitchen-Operations-App

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Run the Model Comparison Benchmark
```bash
python compare_models.py
```
This trains all 4 regression and classification models, calculates $R^2$, $F_1$, MAE, RMSE, and generates visual plots in `reports/plots/`.

### 3. Start Backend API
```bash
cd backend
uvicorn main:app --reload --port 8000
```
API Documentation will be available at `http://localhost:8000/docs`.

### 4. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📁 Repository Structure

```
├── Kitchen_Inventory_Forecasting.csv   # Operational headcount and weather dataset
├── Recipe_Recommendation_Dataset.csv   # Inventory shelf-life and recipe mapping dataset
├── compare_models.py                   # Benchmark script evaluating 4 ML architectures
├── MODEL_BENCHMARK.md                  # Comprehensive comparison report with graphs
├── reports/
│   ├── model_comparison_report.md
│   └── plots/                          # Metric comparison, confusion matrices, feature importance charts
├── backend/                            # FastAPI backend services and database models
├── frontend/                           # React + Vite kitchen ops dashboard
├── dynamic_kitchen_model.joblib        # Serialized production pipeline
├── requirements.txt                    # Project-wide Python dependencies
└── docker-compose.yml                  # Containerized deployment spec
```
