import sqlite3
import re

db_path = r"C:\Users\smartuser\.gemini\antigravity-ide\conversations\1897ccfa-56c6-4eac-84fd-e9db5d558428.db"
out_path = r"C:\Users\smartuser\Desktop\Kitchen\Kitchen_Inventory_Forecasting.csv"

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Get the schema
c.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = c.fetchall()

# Read the steps
try:
    c.execute("SELECT step_payload FROM steps")
    rows = c.fetchall()
    for row in rows:
        content = row[0]
        if content is None: continue
        try:
            content = content.decode('utf-8')
        except:
            content = str(content)
            
        if 'Kitchen_Inventory_Forecasting.csv' in content and 'Date,day_name' in content:
            match = re.search(r'Date,day_name.*', content, re.DOTALL)
            if match:
                csv_data = match.group(0)
                # Clean up
                csv_data = csv_data.split('</USER_REQUEST>')[0].strip()
                csv_data = csv_data.replace('\\n', '\n')
                csv_data = csv_data.replace('\\r', '')
                # Handle potential quoting
                if csv_data.endswith("',"):
                    csv_data = csv_data[:-2]
                if csv_data.endswith("')"):
                    csv_data = csv_data[:-2]
                
                with open(out_path, 'w', encoding='utf-8') as f:
                    f.write(csv_data)
                print(f"Extracted CSV to {out_path}")
                break
except Exception as e:
    print(f"Error: {e}")

conn.close()
