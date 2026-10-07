import json

log_path = r"C:\Users\smartuser\.gemini\antigravity-ide\brain\1897ccfa-56c6-4eac-84fd-e9db5d558428\.system_generated\logs\transcript.jsonl"
out_path = r"C:\Users\smartuser\Desktop\Kitchen\Kitchen_Inventory_Forecasting.csv"

lines = []
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            content = data.get('content', '')
            # Find the actual CSV block
            if 'Date,day_name,special_event_type' in content:
                # Split content by newlines
                for part in content.split('\n'):
                    if part.startswith('Date,day_name') or part.startswith('2024-') or part.startswith('2025-') or part.startswith('2026-'):
                        lines.append(part)

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
    
print(f"Extracted {len(lines)} lines to {out_path}")
