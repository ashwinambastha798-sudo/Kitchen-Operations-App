import json
import re

log_path = r"C:\Users\smartuser\.gemini\antigravity-ide\brain\1897ccfa-56c6-4eac-84fd-e9db5d558428\.system_generated\logs\transcript.jsonl"
out_path = r"C:\Users\smartuser\Desktop\Kitchen\Kitchen_Inventory_Forecasting.csv"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            content = data.get('content', '')
            if 'Kitchen_Inventory_Forecasting.csv' in content and 'Date,day_name' in content:
                # Extract everything starting from Date,day_name
                match = re.search(r'Date,day_name.*', content, re.DOTALL)
                if match:
                    csv_data = match.group(0)
                    # Clean up if there are any trailing tags
                    csv_data = csv_data.split('</USER_REQUEST>')[0].strip()
                    with open(out_path, 'w', encoding='utf-8') as out_f:
                        out_f.write(csv_data)
                    print(f"Extracted CSV to {out_path}")
                    break
