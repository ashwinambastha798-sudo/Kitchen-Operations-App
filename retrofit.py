import pandas as pd
import requests

def main():
    print("Reading Kitchen_Inventory_Forecasting.csv...")
    df = pd.read_csv('Kitchen_Inventory_Forecasting.csv', parse_dates=['Date'])
    
    # Sort by date just in case
    df = df.sort_values('Date')
    
    start_date = df['Date'].min().strftime('%Y-%m-%d')
    end_date = df['Date'].max().strftime('%Y-%m-%d')
    
    # Mumbai coordinates
    latitude = 19.0760
    longitude = 72.8777
    
    print(f"Fetching historical weather data from {start_date} to {end_date}...")
    url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={latitude}&longitude={longitude}"
           f"&start_date={start_date}&end_date={end_date}"
           f"&daily=temperature_2m_max,relative_humidity_2m_mean&timezone=auto")
           
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Error fetching data: {response.text}")
        return
        
    data = response.json()
    daily = data.get('daily', {})
    
    weather_df = pd.DataFrame({
        'Date': pd.to_datetime(daily['time']),
        'temperature_2m_max': daily['temperature_2m_max'],
        'relative_humidity_2m_mean': daily['relative_humidity_2m_mean']
    })
    
    # Merge with original dataframe
    df = pd.merge(df, weather_df, on='Date', how='left')
    
    # Overwrite and drop dummy columns
    if 'temperature_C' in df.columns:
        df = df.drop(columns=['temperature_C'])
    if 'humidity_percent' in df.columns:
        df = df.drop(columns=['humidity_percent'])
        
    df.to_csv('Kitchen_Inventory_Forecasting.csv', index=False)
    print("Successfully retrofitted dataset with real historical API data.")

if __name__ == "__main__":
    main()
