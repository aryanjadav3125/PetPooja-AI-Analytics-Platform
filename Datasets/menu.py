import csv
import random
from datetime import datetime, timedelta

# Categories and sample items with base selling price ranges and food cost ratios
MENU_DATA = {
    "Biryani": (["Chicken Biryani", "Mutton Biryani", "Egg Biryani", "Veg Biryani", "Paneer Biryani"], 200, 500, 0.3),
    "Burger": (["Classic Chicken Burger", "Veggie Burger", "Cheese Burger", "Double Patty Burger"], 120, 300, 0.45), # Plowhorses
    "Pizza": (["Margherita Pizza", "Pepperoni Pizza", "Paneer Tikka Pizza", "BBQ Chicken Pizza"], 250, 600, 0.4), # Plowhorses
    "Indian Main Course": (["Butter Chicken", "Dal Makhani", "Paneer Butter Masala", "Aloo Gobi", "Palak Paneer", "Garlic Naan"], 80, 450, 0.35),
    "South Indian": (["Masala Dosa", "Idli Sambar", "Medu Vada", "Uttapam", "Rava Dosa"], 60, 180, 0.25), # Puzzles
    "Chinese": (["Hakka Noodles", "Veg Manchurian", "Chilli Chicken", "Fried Rice", "Spring Rolls"], 140, 350, 0.3),
    "Snacks": (["French Fries", "Chicken 65", "Vada Pav", "Samosa", "Garlic Bread"], 40, 200, 0.3),
    "Beverages": (["Filter Coffee", "Cold Coffee", "Masala Chai", "Mango Lassi", "Coke"], 30, 150, 0.2), # High margin Puzzles
    "Desserts": (["Gulab Jamun", "Rasmalai", "Chocolate Brownie", "Ice Cream", "Gajar Halwa"], 80, 250, 0.25)
}

def random_date(start, end):
    return start + timedelta(seconds=random.randint(0, int((end - start).total_seconds())))

start_date = datetime(2022, 1, 1)
end_date = datetime(2025, 3, 1)

rows = []
for i in range(1, 1001):
    item_id = f"I{i:04d}"
    merchant_id = f"M{random.randint(1, 50):03d}"
    category = random.choice(list(MENU_DATA.keys()))
    
    items, min_price, max_price, cost_ratio = MENU_DATA[category]
    item_name = random.choice(items)
    
    # Introduce random variance to prices and costs
    selling_price = random.randint(min_price, max_price)
    
    # Calculate food cost based on ratio, add slight random variance (-5% to +5%), ensure it's an int
    variance = random.uniform(-0.05, 0.05)
    food_cost = int(selling_price * (cost_ratio + variance))
    
    contribution_margin = selling_price - food_cost
    
    # 95% of items are active
    is_active = 1 if random.random() < 0.95 else 0 
    
    created_at = random_date(start_date, end_date).strftime("%Y-%m-%d %H:%M:%S")
    
    rows.append([item_id, merchant_id, item_name, category, selling_price, food_cost, contribution_margin, is_active, created_at])

# Write to CSV
with open("menu_items_1000.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["item_id", "merchant_id", "item_name", "category", "selling_price", "food_cost", "contribution_margin", "is_active", "created_at"])
    writer.writerows(rows)

print("Successfully generated 1,000 rows in 'menu_items_1000.csv'")