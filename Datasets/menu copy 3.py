import csv
import random
from datetime import datetime

# Ingredient reference dictionary: {name: (unit, cost_per_unit, normal_min, normal_max)}
INGREDIENTS = {
    "Chicken": ("kg", 220, 25, 80),
    "Rice": ("kg", 89, 40, 200),
    "Paneer": ("kg", 260, 15, 40),
    "Flour": ("kg", 35, 20, 100),
    "Tomato": ("kg", 45, 15, 60),
    "Onion": ("kg", 30, 20, 80),
    "Cheese": ("kg", 350, 10, 30),
    "Oil": ("liter", 115, 15, 50),
    "Milk": ("liter", 55, 20, 60)
}

rows = []
inventory_id_counter = 1
fixed_date = datetime(2025, 10, 9, 6, 0, 0).strftime("%Y-%m-%d %H:%M:%S")

# Generate inventory for 100 merchants
for merchant_num in range(1, 101):
    merchant_id = f"M{merchant_num:03d}"
    
    # Each merchant stocks between 5 and 9 ingredients
    num_ingredients = random.randint(5, 9)
    stocked_items = random.sample(list(INGREDIENTS.keys()), num_ingredients)
    
    for item in stocked_items:
        unit, cost, norm_min, norm_max = INGREDIENTS[item]
        
        # Enforce exactly 20% shortage probability to trigger dashboard alerts
        is_shortage = random.random() < 0.20
        
        if is_shortage:
            # Drop stock to a critical integer level (e.g., 2 to 9 units)
            stock_quantity = random.randint(2, 9)
        else:
            # Normal healthy stock levels
            stock_quantity = random.randint(norm_min, norm_max)
            
        rows.append([
            inventory_id_counter,
            merchant_id,
            item,
            stock_quantity,
            unit,
            cost,
            fixed_date
        ])
        inventory_id_counter += 1

# Write to CSV
with open("inventory_synthetic.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["inventory_id", "merchant_id", "ingredient_name", "stock_quantity", "unit", "cost_per_unit", "last_updated"])
    writer.writerows(rows)

print(f"Successfully generated {len(rows)} inventory records with a 20% forced shortage ratio.")