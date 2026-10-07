import pandas as pd
import random
import numpy as np

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)

ingredients = ['Bread', 'Milk', 'Chicken', 'Fish', 'Flour', 'Pasta', 'Tomatoes', 'Cheese', 'Mutton', 'Eggs']
units = {'Bread': 'packets', 'Milk': 'liters', 'Chicken': 'kg', 'Fish': 'kg', 'Flour': 'kg', 'Pasta': 'kg', 'Tomatoes': 'kg', 'Cheese': 'kg', 'Mutton': 'kg', 'Eggs': 'boxes'}

# Mapping ingredients to Indian recipes and actions
recipe_map = {
    'Bread': [('SAFE', 'Standard Storage', 'Assorted Sandwich Trays'), 
              ('WARNING', 'Prioritize in Regular Menu', 'Garlic Naan/Bread Basket'), 
              ('CRITICAL', 'Push to Special Menu', 'Bread Pakora Special')],
    'Milk': [('SAFE', 'Standard Storage', 'Masala Chai Station'), 
             ('WARNING', 'Prioritize in Regular Menu', 'Paneer Butter Masala'), 
             ('CRITICAL', 'Push to Special Menu', 'Large Batch Kheer (Rice Pudding)')],
    'Chicken': [('SAFE', 'Standard Storage', 'Chicken Biryani Banquet'), 
                ('WARNING', 'Prioritize in Regular Menu', 'Butter Chicken Combo'), 
                ('CRITICAL', 'Push to Special Menu', 'Chicken Tikka Starters (Discount)')],
    'Fish': [('SAFE', 'Standard Storage', 'Goan Fish Curry'), 
             ('WARNING', 'Prioritize in Regular Menu', 'Amritsari Fish Fry'), 
             ('CRITICAL', 'Push to Special Menu', 'Fish Tikka Platter (25% Off)')],
    'Flour': [('SAFE', 'Standard Storage', 'Fresh Tandoori Roti'), 
              ('WARNING', 'Prioritize in Regular Menu', 'Puri Chole Counter'), 
              ('CRITICAL', 'Push to Special Menu', 'Discounted Samosa/Kachori')],
    'Pasta': [('SAFE', 'Standard Storage', 'Masala Macaroni'), 
              ('WARNING', 'Prioritize in Regular Menu', 'Desi Style White Sauce Pasta'), 
              ('CRITICAL', 'Push to Special Menu', 'Baked Masala Pasta (Quick Clear)')],
    'Tomatoes': [('SAFE', 'Standard Storage', 'Large Batch Tomato Gravy'), 
                 ('WARNING', 'Prioritize in Regular Menu', 'Tomato Shorba'), 
                 ('CRITICAL', 'Push to Special Menu', 'Roasted Tomato Soup')],
    'Cheese': [('SAFE', 'Standard Storage', 'Paneer Tikka Board'), 
               ('WARNING', 'Prioritize in Regular Menu', 'Cheese Corn Balls'), 
               ('CRITICAL', 'Push to Special Menu', 'Cheese Naan/Kulcha Event')],
    'Mutton': [('SAFE', 'Standard Storage', 'Mutton Rogan Josh'), 
               ('WARNING', 'Prioritize in Regular Menu', 'Mutton Keema Pav'), 
               ('CRITICAL', 'Push to Special Menu', 'Mutton Biryani Special')],
    'Eggs': [('SAFE', 'Standard Storage', 'Egg Curry / Anda Masala'), 
             ('WARNING', 'Prioritize in Regular Menu', 'Masala Omelette Counter'), 
             ('CRITICAL', 'Push to Special Menu', 'Mass Egg Biryani Special')]
}

data = []
for _ in range(500):
    turnout = np.random.randint(50, 600)
    ing = random.choice(ingredients)
    qty = round(random.uniform(5.0, 150.0), 1)
    days = np.random.randint(1, 21)
    
    # Determine status
    if days <= 3:
        status_idx = 2
    elif days <= 8:
        status_idx = 1
    else:
        status_idx = 0
        
    status, action, recipe = recipe_map[ing][status_idx]
    
    data.append([turnout, ing, qty, units[ing], days, status, action, recipe])

df = pd.DataFrame(data, columns=['predicted_turnout', 'ingredient', 'quantity_available', 'unit', 'days_to_expiry', 'expiry_status', 'action_required', 'suggested_recipe'])
df.to_csv('Recipe_Recommendation_Dataset.csv', index=False)
print("Indian dataset generated successfully.")
